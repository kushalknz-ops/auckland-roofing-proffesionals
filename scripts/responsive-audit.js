/**
 * Responsive regression audit using installed Chrome/Edge and native CDP.
 * Usage: node scripts/responsive-audit.js --label final --screenshots --interactions --responsive-interactions
 * Optional: --widths 320,768,1440 --routes /,/contact --media-interactions
 * Enquiry requests are intercepted; this audit never sends an enquiry.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { SERVICES } from '../src/data/services.ts'
import { PROJECTS } from '../src/data/projects.ts'
import axe from 'axe-core'

const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const origin = option('--origin', 'http://127.0.0.1:5174')
const label = option('--label', 'final').replace(/[^a-z0-9_-]/gi, '')
const widths = option('--widths', '320,375,390,430,768,1024,1280,1440,1920,2560,3840').split(',').map(Number)
const articles = ['operations', 'planning'].flatMap(name => JSON.parse(fs.readFileSync(`src/content/blog-${name}.json`, 'utf8')))
const allRoutes = [
  '/', '/commercial', '/residential', ...SERVICES.map(s => `/service/${s.id}`),
  '/contact', '/privacy-policy', '/terms-and-conditions',
  '/blog', ...articles.map(a => `/blog/${a.slug}`), ...PROJECTS.map(p => `/projects/${p.slug}`),
  '/404', '/service?id=unknown', '/blog/unknown', '/projects/unknown', '/404.html', '/social-preview.html',
]
const routes = option('--routes', '').split(',').filter(Boolean)
const selectedRoutes = args.includes('--only-interactions') ? [] : routes.length ? routes : allRoutes
const output = path.resolve('artifacts', 'responsive', label)
fs.mkdirSync(output, { recursive: true })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

class CDP {
  constructor(url) { this.url = url; this.nextId = 1; this.pending = new Map(); this.listeners = new Map() }
  async connect() {
    this.ws = new WebSocket(this.url)
    await new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject })
    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data)
      if (msg.id && this.pending.has(msg.id)) {
        const entry = this.pending.get(msg.id); this.pending.delete(msg.id); clearTimeout(entry.timer)
        if (msg.error) entry.reject(new Error(msg.error.message)); else entry.resolve(msg.result)
      } else (this.listeners.get(msg.method) || []).forEach(fn => fn(msg.params))
    }
  }
  on(event, handler) { this.listeners.set(event, [...this.listeners.get(event) || [], handler]) }
  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 20000)
      this.pending.set(id, { resolve, reject, timer }); this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
    return result.result.value
  }
  close() { this.ws?.close() }
}

const inspect = `(() => {
  const viewport = document.documentElement.clientWidth;
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0,3).join('.') : '');
  const visible = el => {
    if (!el.getClientRects().length || el.closest('[inert], [aria-hidden="true"]')) return false;
    for (let p=el; p && p!==document.body; p=p.parentElement) { const s=getComputedStyle(p); if (s.visibility==='hidden'||s.display==='none'||Number(s.opacity)<.05) return false; }
    return true;
  };
  const intentional = el => {
    for (let p=el.parentElement; p && p!==document.body; p=p.parentElement) {
      const s=getComputedStyle(p);
      if (['auto','scroll'].includes(s.overflowX) && p.scrollWidth>p.clientWidth+2) return true;
      if (p.matches('.gr-slider-viewport')) return true;
    }
    return false;
  };
  const overflow=[]; const clipped=[]; const smallTargets=[];
  for (const el of document.querySelectorAll('body *')) {
    if (el instanceof SVGElement || !visible(el)) continue;
    const r=el.getBoundingClientRect(), s=getComputedStyle(el);
    if (r.width>0 && r.height>0 && (r.left< -1 || r.right>viewport+1) && !intentional(el) && !el.matches('.skip-link,.hero-media,.page-hero-media,.hero-overlay,.hero-shade,.trust-shade,.sr-only')) overflow.push({selector:name(el),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),text:el.textContent?.trim().slice(0,65)});
    if (el.childElementCount===0 && /^(H[1-6]|P|A|BUTTON|SPAN|STRONG|SMALL|LABEL)$/.test(el.tagName) && r.width>0 && ['hidden','clip'].includes(s.overflowX) && el.scrollWidth>el.clientWidth+2 && !intentional(el)) clipped.push({selector:name(el),client:el.clientWidth,scroll:el.scrollWidth,text:el.textContent?.trim().slice(0,65)});
    if (el.matches('a,button,input:not([type="hidden"]),select,textarea,summary') && !intentional(el) && r.width>0 && r.height>0 && (r.width<43.5||r.height<43.5)) smallTargets.push({selector:name(el),width:Math.round(r.width),height:Math.round(r.height),text:(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,45)});
  }
  const projectTrack=document.querySelector('.projects-track');
  if (projectTrack) {
    const trackStyle=getComputedStyle(projectTrack);
    for (const [edge,gutter] of [['::before',trackStyle.paddingLeft],['::after',trackStyle.paddingRight]]) {
      const fade=getComputedStyle(projectTrack.parentElement,edge);
      if (fade.display!=='none'&&parseFloat(fade.width)>parseFloat(gutter)+1) {
        clipped.push({selector:'.projects-carousel-wrap'+edge,text:'Carousel fade extends past the gutter',width:fade.width,gutter});
      }
    }
  }
  return {
    viewport,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
    title:document.title,h1:[...document.querySelectorAll('h1')].map(el=>el.textContent),
    sections:document.querySelectorAll('main section').length,
    brokenImages:[...document.images].filter(el=>visible(el)&&el.complete&&!el.naturalWidth).map(el=>el.src),
    unrevealed:[...document.querySelectorAll('main .reveal:not(.visible)')].filter(el=>getComputedStyle(el).display!=='none').map(name),
    overflow:overflow.slice(0,35),clipped:clipped.slice(0,15),smallTargets:smallTargets.slice(0,40),
    horizontalScroll:document.documentElement.scrollWidth>viewport+1,
  };
})()`

let browser, cdp, profile
let enquiryMode = 'error'
const pendingEnquiries=[]
const report = { label, engine: 'Chromium (installed Chrome/Edge)', origin, startedAt: new Date().toISOString(), widths, routes: selectedRoutes, cases: [], interactions: [], accessibility: [], screenshots: [], errors: [], enquiryRequestsIntercepted: 0 }
if(args.includes('--resume')&&fs.existsSync(path.join(output,'report.json'))) {
  Object.assign(report,JSON.parse(fs.readFileSync(path.join(output,'report.json'),'utf8')))
  report.accessibility ||= []
}
const pendingRoutes=selectedRoutes.filter(route=>!widths.every(width=>report.cases.some(entry=>entry.route===route&&entry.width===width)))
let currentContext = ''
async function viewport(width, height = args.includes('--reflow-200') ? 450 : width < 768 ? 800 : 900) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: args.includes('--reflow-200')?2:1, mobile: false })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: width < 1024, maxTouchPoints: 1 })
}
async function navigate(route) {
  await cdp.send('Page.navigate', { url: origin + route })
  let ready = false
  for (let i = 0; i < 80; i++) {
    await sleep(100)
    ready = await cdp.evaluate(`location.href===${JSON.stringify(origin+route)} && document.readyState!=='loading' && Boolean(document.querySelector('h1')) && !document.querySelector('[aria-label="Loading page"]')`).catch(() => false)
    if (ready) break
  }
  if (!ready) throw new Error(`Page did not render at ${route}`)
  await cdp.evaluate('document.fonts.ready').catch(()=>{})
  await sleep(200)
}
async function revealPage() {
  await cdp.evaluate(`(async () => { for(let y=0;y<document.documentElement.scrollHeight;y+=Math.max(300,innerHeight*.65)){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,70));} for(const el of document.querySelectorAll('main .reveal:not(.visible)')) {el.scrollIntoView({block:'center',behavior:'instant'});await new Promise(r=>setTimeout(r,100));}window.scrollTo({top:0,behavior:'instant'});})()`)
  await sleep(900)
}
async function screenshot(route, width, suffix = '', viewportOnly = false) {
  const safe = route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^a-z0-9_-]/gi, '-')
  const file = path.join(output, `${safe}-${width}${suffix}.png`)
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !viewportOnly, fromSurface: true })
  fs.writeFileSync(file, Buffer.from(data, 'base64')); report.screenshots.push(file)
}
async function detailScreenshot(route, width, selector, suffix) {
  await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'start',behavior:'instant'})`)
  await sleep(250)
  const clip=await cdp.evaluate('({x:0,y:window.scrollY,width:innerWidth,height:innerHeight,scale:1})')
  const safe=route==='/'?'home':route.replace(/^\//,'').replace(/[^a-z0-9_-]/gi,'-')
  const file=path.join(output,`${safe}-${width}-${suffix}.png`)
  const {data}=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip})
  fs.writeFileSync(file,Buffer.from(data,'base64'));report.screenshots.push(file)
  await cdp.evaluate("window.scrollTo({top:0,behavior:'instant'})")
}
async function regionScreenshot(name,width,selector) {
  const box=await cdp.evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.max(0,r.left-8),y:Math.max(0,r.top+scrollY-8),width:Math.min(innerWidth,r.width+16),height:r.height+16,scale:1}})()`)
  const {data}=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:box})
  const file=path.join(output,`${name}-${width}.png`);fs.writeFileSync(file,Buffer.from(data,'base64'));report.screenshots.push(file)
}

async function clearStateScreenshots() {
  for(const width of [390,1440]) {
    await viewport(width);await navigate('/');await revealPage()
    for(let step=1;step<=4;step++) {
      const selector=`.process-step:nth-of-type(${step})`
      await click(selector);await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0})
      await cdp.evaluate(`(() => {const selected=document.querySelector(${JSON.stringify(selector)});selected.blur();selected.focus({preventScroll:true});window.scrollTo({top:Math.max(0,document.querySelector('#process').getBoundingClientRect().top+scrollY-104),behavior:'instant'})})()`)
      await sleep(1000)
      const current=await cdp.evaluate(`document.querySelector('.process-step.is-active .step-dot b').textContent`)
      check(`Clear process screenshot preserves selected step${step} at${width}px`,current===String(step).padStart(2,'0'),{current})
      await regionScreenshot(`process-active-${step}`,width,'#process')
      if(step===1)await screenshot('process-first-step',width,'',true)
    }
    await cdp.evaluate(`document.activeElement?.blur();window.scrollTo({top:Math.max(0,document.querySelector('.why-values-bar').getBoundingClientRect().top+scrollY-104),behavior:'instant'})`)
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});await sleep(1100)
    await regionScreenshot('trust-alignment',width,'.why-values-bar')
    if(width===390)await screenshot('trust-all-rows',width,'',true)
  }
}
async function click(selector) {
  await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center',behavior:'instant'})`)
  const rect = await cdp.evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e) return null; const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  if (!rect) throw new Error(`Missing click target ${selector}`)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...rect, button: 'left', clickCount: 1 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...rect, button: 'left', clickCount: 1 })
  await sleep(250)
}
async function key(key, code = key, modifiers = 0) {
  const virtualKey={Tab:9,Escape:27,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Enter:13,Home:36,End:35}[key]
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey })
  await sleep(60)
}
async function swipe(selector, horizontal = true) {
  await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`)
  await sleep(150)
  const rect = await cdp.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:Math.min(innerWidth-35,r.right-35),y:Math.max(180,Math.min(innerHeight-80,r.top+r.height*.4))}; })()`)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...rect, id: 1, radiusX: 3, radiusY: 3, force: 1 }] })
  for(let n=1;n<=8;n++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x-(horizontal?n*22:0), y:rect.y-(horizontal?0:n*20),id:1,radiusX:3,radiusY:3,force:1 }] }); await sleep(20) }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(600)
}
function check(name, pass, details) { report.interactions.push({name,pass,...details});fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' '+JSON.stringify(details)}`) }
async function input(selector, value) {
  await cdp.evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('Missing input '+${JSON.stringify(selector)});const proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`)
  await sleep(80)
}
async function axeAudit(name) {
  if(!args.includes('--axe')) return
  await cdp.evaluate(axe.source)
  const result=await cdp.evaluate(`axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}).then(r=>({passes:r.passes.length,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,failure:n.failureSummary}))}))}))`)
  report.accessibility.push({name,...result});console.log('AXE',name,JSON.stringify(result))
}

async function formInteractions(width = 320, height = 568) {
  currentContext = `Forms @ ${width} × ${height}`
  await viewport(width,height);await navigate('/');await click('.hero-copy .outline-btn')
  await click('.modal .enquiry-primary')
  check('Quote step 2 opens and focuses heading',await cdp.evaluate(`Boolean(document.querySelector('.modal .enquiry-fields'))&&document.activeElement?.tagName==='H2'`))
  await click('.modal .enquiry-primary')
  check('Quote project validation identifies required fields',await cdp.evaluate(`document.querySelectorAll('.modal [aria-invalid="true"]').length>=3`))
  const serviceValue=await cdp.evaluate(`document.querySelector('.modal select option:nth-child(2)')?.value || [...document.querySelector('.modal select').options].find(o=>o.value)?.value`)
  await input('.modal select',serviceValue)
  await input('.modal input[placeholder="e.g. Mount Eden, Auckland"]','Mount Eden')
  await input('.modal textarea','Responsive browser test only. This request is intercepted locally.')
  check('Quote fields use at least 16px text',await cdp.evaluate(`[...document.querySelectorAll('.modal .enquiry-fields input:not([type="file"]),.modal select,.modal textarea')].every(e=>parseFloat(getComputedStyle(e).fontSize)>=16)`))
  if(args.includes('--screenshots')) await detailScreenshot('quote-step-2',width,'.modal .enquiry-fields','fields')
  await click('.modal .enquiry-primary')
  check('Quote contact step retains project values and opens',await cdp.evaluate(`Boolean(document.querySelector('.modal input[autocomplete="name"]'))`))
  await click('.modal .enquiry-submit')
  check('Quote contact validation identifies required fields',await cdp.evaluate(`document.querySelectorAll('.modal [aria-invalid="true"]').length>=3`))
  await input('.modal input[autocomplete="name"]','Responsive Audit')
  await input('.modal input[type="email"]','responsive-audit@example.invalid')
  await input('.modal input[type="tel"]','0211234567')
  enquiryMode=args.includes('--form-visual-states')?'pending':'error';await click('.modal .enquiry-submit');await sleep(300)
  if(args.includes('--form-visual-states')) {
    await visibleStateCheck('Quote loading text and disabled inputs remain readable','.modal .enquiry-submit,.modal input[type="email"],.modal .enquiry-spinner')
    check('Quote pending submission disables controls and shows spinner',await cdp.evaluate(`document.querySelector('.modal .enquiry-submit').disabled&&Boolean(document.querySelector('.modal .enquiry-spinner'))`))
    if(args.includes('--screenshots'))await screenshot('quote-loading',width,'',true)
    await resolvePending('error');await sleep(250)
    await visibleStateCheck('Quote error alert remains readable','.modal .enquiry-alert,.modal .enquiry-alert button,.modal .enquiry-alert a')
    if(args.includes('--screenshots'))await screenshot('quote-error',width,'',true)
  }
  check('Quote submission error remains recoverable',await cdp.evaluate(`Boolean(document.querySelector('.modal .enquiry-alert'))&&!document.querySelector('.modal .enquiry-submit').disabled`))
  enquiryMode='success';await click('.modal .enquiry-submit');await sleep(300)
  check('Quote intercepted success displays confirmation',await cdp.evaluate(`Boolean(document.querySelector('.modal .enquiry-success'))`))
  if(args.includes('--form-visual-states')) {
    await visibleStateCheck('Quote success heading and action remain readable','.modal .enquiry-success h2,.modal .enquiry-success .enquiry-primary')
    if(args.includes('--screenshots'))await screenshot('quote-success',width,'',true)
  }
  await key('Escape')
  await navigate('/contact');await revealPage()
  await click('.contact-submit-btn')
  check('Contact form validates required fields',await cdp.evaluate(`document.querySelectorAll('.contact-form-fields [aria-invalid="true"]').length>=4`))
  await input('#fullName','Responsive Audit');await input('#email','responsive-audit@example.invalid');await input('#phone','0211234567')
  const contactService=await cdp.evaluate(`[...document.querySelector('#service').options].find(o=>o.value)?.value`)
  await input('#service',contactService);await input('#message','Responsive browser test only. The request is intercepted locally.')
  enquiryMode=args.includes('--form-visual-states')?'pending':'error';await click('.contact-submit-btn');await sleep(300)
  if(args.includes('--form-visual-states')) {
    await visibleStateCheck('Contact loading text and disabled inputs remain readable','.contact-submit-btn,#email,.contact-spinner')
    check('Contact pending submission disables controls and shows spinner',await cdp.evaluate(`document.querySelector('.contact-submit-btn').disabled&&Boolean(document.querySelector('.contact-spinner'))`))
    if(args.includes('--screenshots'))await screenshot('contact-loading',width,'',true)
    await resolvePending('error');await sleep(250)
    await visibleStateCheck('Contact error alert remains readable','.contact-form-alert,.contact-form-alert button,.contact-form-alert a')
    if(args.includes('--screenshots'))await screenshot('contact-error',width,'',true)
  }
  check('Contact submission error preserves entered values',await cdp.evaluate(`Boolean(document.querySelector('.contact-form-alert'))&&document.querySelector('#fullName').value==='Responsive Audit'`))
  enquiryMode='success';await click('.contact-submit-btn');await sleep(300)
  check('Contact intercepted success displays confirmation',await cdp.evaluate(`Boolean(document.querySelector('.contact-form-success'))`))
  if(args.includes('--form-visual-states')) {
    await visibleStateCheck('Contact success text and reset action remain readable','.contact-form-success h3,.contact-reset-btn')
    if(args.includes('--screenshots'))await detailScreenshot('/contact',width,'.contact-form-success','success')
  }
  await click('.contact-reset-btn');check('Contact form resets after confirmation',await cdp.evaluate(`document.querySelector('#fullName').value===''`))
  await axeAudit(currentContext)
}

async function interactions() {
  const mobileWidth=args.includes('--landscape')?844:320, mobileHeight=args.includes('--landscape')?390:568
  await viewport(mobileWidth,mobileHeight); await navigate('/'); await revealPage()
  if(args.includes('--screenshots')) await screenshot('/',mobileWidth,'-hero',true)
  await click('.menu-btn')
  let state = await cdp.evaluate(`(() => {const e=document.querySelector('#mobileNav'),r=e.getBoundingClientRect();return {open:document.querySelector('.menu-btn').getAttribute('aria-expanded'),left:r.left,right:r.right,top:r.top,bottom:r.bottom,bodyLocked:getComputedStyle(document.body).overflowY,active:document.activeElement?.className}})()`)
  check(`Mobile navigation opens within ${mobileWidth} × ${mobileHeight} viewport`, state.open==='true'&&state.left>=-1&&state.right<=mobileWidth+1&&state.bottom<=mobileHeight+1,{state})
  await click('.mobile-services-toggle'); await click('.mobile-services-toggle')
  state = await cdp.evaluate(`({links:document.querySelectorAll('.mobile-service-link').length,expanded:document.querySelector('.mobile-services-toggle').getAttribute('aria-expanded')})`)
  check('Mobile services expand with all nine links',state.links===9&&state.expanded==='true',{state})
  await axeAudit('Mobile navigation open')
  if(args.includes('--screenshots')) await screenshot('mobile-menu',mobileWidth,'',true)
  await key('Escape'); check('Escape closes mobile menu',await cdp.evaluate(`document.querySelector('.menu-btn').getAttribute('aria-expanded')==='false'`))
  await click('.menu-btn');await click('#mobileNav a[href="/#projects"]');await sleep(1200)
  state=await cdp.evaluate(`({targetTop:document.querySelector('#projects').getBoundingClientRect().top,headerBottom:document.querySelector('.site-header').getBoundingClientRect().bottom})`)
  check('Section navigation uses a single header clearance',state.targetTop>=state.headerBottom-1&&state.targetTop<=state.headerBottom+65,{state})
  await click('.menu-btn'); await viewport(1280); await sleep(200)
  check('Resize to desktop releases mobile scroll lock',await cdp.evaluate(`getComputedStyle(document.body).overflowY!=='hidden'`))
  await navigate('/'); await click('.nav-dropdown-btn')
  check('Desktop services menu opens',await cdp.evaluate(`document.querySelector('.nav-dropdown-btn').getAttribute('aria-expanded')==='true'`))
  await key('Escape')
  check('Escape closes desktop services menu',await cdp.evaluate(`document.querySelector('.nav-dropdown-btn').getAttribute('aria-expanded')==='false'`))
  if(args.includes('--screenshots')) await screenshot('/',1280,'-hero',true)
  await viewport(mobileWidth,mobileHeight); await navigate('/'); await click('.hero-copy .outline-btn')
  await sleep(200)
  state = await cdp.evaluate(`(() => {const e=document.querySelector('.modal-card'),r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,scroll:e.scrollHeight,client:e.clientHeight,focus:document.activeElement?.className}})()`)
  check('Quote dialog fits short mobile viewport',state.top>=-1&&state.bottom<=mobileHeight+1&&state.left>=-1&&state.right<=mobileWidth+1,{state})
  await key('Tab','Tab',1)
  check('Quote dialog contains backward keyboard focus',await cdp.evaluate(`Boolean(document.activeElement.closest('.modal'))`))
  await axeAudit('Quote dialog mobile')
  if(args.includes('--screenshots')) await screenshot('quote-modal',mobileWidth,'',true)
  await key('Escape'); check('Escape closes quote dialog',await cdp.evaluate(`!document.querySelector('.modal.open')`))
  await click('.menu-btn');await click('#mobileNav .outline-btn');await sleep(150)
  state=await cdp.evaluate(`({modal:Boolean(document.querySelector('.modal.open')),menu:document.querySelector('.menu-btn').getAttribute('aria-expanded'),active:document.activeElement?.className})`)
  check('Quote opens from mobile navigation',state.modal&&state.menu==='false',{state})
  await key('Escape');await sleep(150)
  state=await cdp.evaluate(`({overflow:getComputedStyle(document.body).overflowY,inert:[...document.querySelectorAll('main,.site-header,.site-footer')].filter(e=>e.inert).length,focus:document.activeElement?.className})`)
  check('Closing menu-origin quote restores page scrolling, background and menu focus',state.overflow!=='hidden'&&state.inert===0&&state.focus.includes('menu-btn'),{state})
  if(args.includes('--landscape')) {
    await viewport(320,568);await navigate('/');await click('.menu-btn')
    if(args.includes('--screenshots')) await screenshot('mobile-menu',320,'',true)
    await click('#mobileNav .outline-btn')
    if(args.includes('--screenshots')) await screenshot('quote-modal',320,'',true)
    await key('Escape');await sleep(150)
    state=await cdp.evaluate(`({overflow:getComputedStyle(document.body).overflowY,inert:[...document.querySelectorAll('main,.site-header,.site-footer')].filter(e=>e.inert).length,focus:document.activeElement?.className})`)
    check('Portrait menu-origin quote restores page and hamburger focus',state.overflow!=='hidden'&&state.inert===0&&state.focus.includes('menu-btn'),{state})
    if(args.includes('--screenshots')) await screenshot('/',320,'-hero',true)
  }
  if(args.includes('--nav-modal-only')) return
  await viewport(390,844); await navigate('/'); await revealPage()
  const beforeProject=await cdp.evaluate(`document.querySelector('.projects-track').scrollLeft`)
  await click('.projects-nav-btn.next'); await sleep(700)
  let afterProject=await cdp.evaluate(`document.querySelector('.projects-track').scrollLeft`)
  check('Project next arrow advances carousel',afterProject>beforeProject,{before:beforeProject,after:afterProject})
  const swipeStart=afterProject; await swipe('.projects-track')
  afterProject=await cdp.evaluate(`document.querySelector('.projects-track').scrollLeft`)
  check('Synthesized touch swipe advances project carousel',afterProject>swipeStart,{before:swipeStart,after:afterProject})
  const reviewsBefore=await cdp.evaluate(`document.querySelector('.gr-slider-track').style.transform`)
  await swipe('.gr-slider-container')
  const reviewsAfter=await cdp.evaluate(`document.querySelector('.gr-slider-track').style.transform`)
  check('Synthesized touch swipe advances reviews',reviewsAfter!==reviewsBefore,{before:reviewsBefore,after:reviewsAfter})
  await cdp.evaluate(`document.querySelector('.gr-card-col:not([inert]) .gr-read-more')?.focus()`)
  await key('ArrowRight','ArrowRight')
  check('Review arrow-key navigation keeps focus on an available control',await cdp.evaluate(`document.activeElement!==document.body&&!document.activeElement.closest('[inert]')&&Boolean(document.activeElement.closest('#testimonials'))`))
  const scrollBefore=await cdp.evaluate('window.scrollY'); await swipe('.gr-slider-container',false)
  const scrollAfter=await cdp.evaluate('window.scrollY')
  check('Vertical touch gesture over reviews scrolls the page',Math.abs(scrollAfter-scrollBefore)>20,{before:scrollBefore,after:scrollAfter})
  await click('.faq-q'); check('FAQ expands on tap',await cdp.evaluate(`document.querySelector('.faq-q').getAttribute('aria-expanded')==='true'`))
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await navigate('/'); await revealPage()
  state=await cdp.evaluate(`({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:document.querySelectorAll('.reveal:not(.visible)').length,scroll:getComputedStyle(document.documentElement).scrollBehavior})`)
  check('Reduced motion leaves content visible and disables smooth scrolling',state.matches&&state.hidden===0&&state.scroll==='auto',{state})
  await cdp.send('Emulation.setEmulatedMedia',{features:[]})
  await formInteractions()
  for(const route of ['/','/blog/commercial-roof-maintenance','/projects/remuera-villa-re-roof']) {await navigate(route);await revealPage();await axeAudit(route+' mobile')}
}

async function responsiveInteractions() {
  await viewport(widths[0]);await navigate('/')
  for (const width of widths) {
    const height = width < 768 ? 568 : 720
    await viewport(width,height)
    const trigger = width < 1200 ? '.menu-btn' : '.nav-dropdown-btn'
    const panel = width < 1200 ? '#mobileNav' : '#servicesMegaMenu'
    await click(trigger)
    const state = await cdp.evaluate(`(() => {
      const panel=document.querySelector(${JSON.stringify(panel)})
      const trigger=document.querySelector(${JSON.stringify(trigger)})
      const r=panel.getBoundingClientRect(), button=trigger.getBoundingClientRect()
      return {left:r.left,right:r.right,bottom:r.bottom,top:r.top,
        targetWidth:button.width,targetHeight:button.height,
        open:trigger.getAttribute('aria-expanded')==='true',
        serviceCount:panel.querySelectorAll('a[href^="/service/"]').length}
    })()`)
    check(`Navigation and all nine services fit at ${width}px`,
      state.open&&state.serviceCount===9&&state.left>=-1&&state.right<=width+1&&state.bottom<=height+1&&state.top>=0&&state.targetWidth>=44&&state.targetHeight>=44,{state})
    await key('Escape')
  }

  for (const width of [320,768,1440]) {
    await viewport(width);await navigate('/blog')
    await input('#blog-search','zz-no-matching-roof-article-zz')
    check(`Blog search displays its empty state at ${width}px`,await cdp.evaluate(`Boolean(document.querySelector('.blog-empty'))`))
    await click('.blog-empty .blog-button')
    check(`Blog search resets at ${width}px`,await cdp.evaluate(`!document.querySelector('.blog-empty')&&document.querySelector('#blog-search').value===''`))
    await navigate('/projects/remuera-villa-re-roof')
    await click('.case-timeline li:nth-child(2) summary')
    check(`Case study timeline expands at ${width}px`,await cdp.evaluate(`document.querySelector('.case-timeline li:nth-child(2) details').open`))
  }

  for (const width of [768,1440]) await formInteractions(width,720)
}

async function mediaInteractions() {
  currentContext = 'Homepage media'
  const mapRequests = new Map()
  cdp.on('Network.requestWillBeSent', ({requestId,request}) => {
    if (request.url.startsWith('https://www.google.com/maps?')) mapRequests.set(requestId,{url:request.url})
  })
  cdp.on('Network.responseReceived', ({requestId,response}) => {
    if (mapRequests.has(requestId)) mapRequests.get(requestId).status=response.status
  })
  cdp.on('Network.loadingFailed', ({requestId,errorText,blockedReason}) => {
    if (mapRequests.has(requestId)) Object.assign(mapRequests.get(requestId),{errorText,blockedReason})
  })
  await viewport(320,568);await navigate('/')
  await sleep(1600)
  check('Mobile hero uses the compact poster and stays paused',await cdp.evaluate(`(() => {
    const video=document.querySelector('.hero-video')
    return video.paused&&video.poster.endsWith('landing-video-poster-mobile.webp')
  })()`))
  await viewport(1440);await navigate('/')
  for (let i=0;i<24;i++) {
    if (await cdp.evaluate(`Boolean(document.querySelector('.hero-video-toggle'))`)) break
    await sleep(250)
  }
  const externalVideoPlaying=await cdp.evaluate(`!document.querySelector('.hero-video').paused&&Boolean(document.querySelector('.hero-video-toggle'))`)
  report.media={externalVideoPlaying}
  if (!externalVideoPlaying) {
    // Exercise the browser's real media playback events if the host cannot reach the CDN.
    await navigate('/')
    await cdp.evaluate(`(() => {
      const canvas=document.createElement('canvas')
      canvas.width=64;canvas.height=36
      const context=canvas.getContext('2d')
      setInterval(()=>context.fillRect(0,0,64,36),100)
      document.querySelector('.hero-video').srcObject=canvas.captureStream(10)
    })()`)
    await sleep(1800)
  }
  const selector='.hero-video-toggle'
  await click(selector)
  check('Desktop background video pause control stops playback',await cdp.evaluate(`document.querySelector('.hero-video').paused&&document.querySelector('.hero-video-toggle').getAttribute('aria-label')==='Play background video'`))
  await click(selector)
  check('Desktop background video play control resumes playback',await cdp.evaluate(`!document.querySelector('.hero-video').paused&&document.querySelector('.hero-video-toggle').getAttribute('aria-label')==='Pause background video'`))
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await sleep(250)
  check('Reduced motion pauses the video and hides its control',await cdp.evaluate(`document.querySelector('.hero-video').paused&&!document.querySelector('.hero-video-toggle').getClientRects().length`))
  await cdp.send('Emulation.setEmulatedMedia',{features:[]})

  for (const route of ['/', '/contact']) {
    await navigate(route)
    await cdp.evaluate(`document.querySelector('iframe').scrollIntoView({block:'center',behavior:'instant'})`)
    await sleep(2500)
    const state=await cdp.evaluate(`(() => {
      const frame=document.querySelector('iframe'),r=frame.getBoundingClientRect()
      return {width:r.width,height:r.height,left:r.left,right:r.right,src:frame.src}
    })()`)
    check(`Map embed has usable dimensions on ${route}`,state.width>0&&state.height>0&&state.left>=0&&state.right<=1441,{state})
    if (args.includes('--screenshots')) await screenshot(route,1440,'-map',true)
  }
  report.media.mapRequests=[...mapRequests.values()]
  const {targetInfos}=await cdp.send('Target.getTargets')
  report.media.mapFrames=targetInfos.filter(({type})=>type==='iframe').map(({url})=>url)
}

async function staticInteractions() {
  await viewport(320,568);await navigate('/social-preview.html')
  for(const page of ['commercial','residential','contact','home']) {
    await click(`.tab-btn[data-page="${page}"]`)
    const state=await cdp.evaluate(`({selected:document.querySelector('.tab-btn[aria-pressed="true"]')?.dataset.page,headings:[...document.querySelectorAll('#fb-title,#li-title,#tw-title,#wa-title')].map(e=>e.textContent),broken:[...document.images].filter(e=>e.complete&&!e.naturalWidth).length})`)
    check(`Social preview switches to ${page}`,state.selected===page&&new Set(state.headings).size===1&&!state.broken,{state})
  }
  await cdp.evaluate(`document.querySelector('.meta-scroll').scrollIntoView({block:'center',behavior:'instant'});document.querySelector('.meta-scroll').focus()`)
  const before=await cdp.evaluate(`document.querySelector('.meta-scroll').scrollLeft`)
  await key('ArrowRight','ArrowRight');await sleep(250)
  const after=await cdp.evaluate(`document.querySelector('.meta-scroll').scrollLeft`)
  const state=await cdp.evaluate(`(() => {const e=document.querySelector('.meta-scroll');return {client:e.clientWidth,scroll:e.scrollWidth,focused:document.activeElement===e,overflow:getComputedStyle(e).overflowX}})()`)
  check('Metadata table scrolls horizontally with keyboard',state.scroll<=state.client||after>before,{before,after,state})
}

async function processProgressChecks() {
  for(const width of [320,1440]) {
    for (const motion of ['no-preference', 'reduce']) {
      await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:motion}]})
      await viewport(width);await navigate('/');await click('.process-step:nth-of-type(2)');await sleep(600)
      const state=await cdp.evaluate(`(() => {
        const fill=document.querySelector('.process-progress-fill').getBoundingClientRect()
        const rail=document.querySelector('.process-progress').getBoundingClientRect()
        return {fill:[fill.width,fill.height],rail:[rail.width,rail.height],active:[...document.querySelectorAll('.process-step')].findIndex(e=>e.classList.contains('is-active'))}
      })()`)
      const axis=width===320?1:0
      check(`Process rail shows one-third progress at ${width}px with ${motion}`,state.active===1&&Math.abs(state.fill[axis]*3-state.rail[axis])<1&&Math.abs(state.fill[1-axis]-2)<.1,{state})
    }
  }
  await cdp.send('Emulation.setEmulatedMedia',{features:[]})
}

// Painted text is checked independently of the accessibility tree. In particular,
// the process numbers remain visually essential although their parent is aria-hidden.
const paintedContrastFunction = `(selector) => {
  const rgba=value=>{const values=value.match(/[\\d.]+/g)?.map(Number)||[];return values.length>=3?[...values.slice(0,3),values[3]??1]:[0,0,0,0]};
  const over=(front,back)=>{const a=front[3]+back[3]*(1-front[3]);return a?[(front[0]*front[3]+back[0]*back[3]*(1-front[3]))/a,(front[1]*front[3]+back[1]*back[3]*(1-front[3]))/a,(front[2]*front[3]+back[2]*back[3]*(1-front[3]))/a,a]:[0,0,0,0]};
  const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  return [...document.querySelectorAll(selector)].map(el=>{
    const s=getComputedStyle(el),rect=el.getBoundingClientRect(),parents=[];for(let p=el;p;p=p.parentElement)parents.unshift(p);
    let bg=[255,255,255,1];for(const p of parents){bg=over(rgba(getComputedStyle(p).backgroundColor),bg);if(p.matches('.site-header')&&p.querySelector('.header-glass')&&getComputedStyle(p.querySelector('.header-glass')).display!=='none')bg=over(rgba(getComputedStyle(p.querySelector('.hg-tint')).backgroundColor),bg);}
    const fg=over(rgba(s.color),bg),l1=luminance(fg),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    const size=parseFloat(s.fontSize),weight=parseFloat(s.fontWeight),minimum=size>=24||(size>=18.66&&weight>=700)?3:4.5;
    return {text:el.textContent?.trim().slice(0,75),color:s.color,background:bg.slice(0,3).map(Math.round),ratio:Number(ratio.toFixed(2)),minimum,fontSize:size,fontWeight:weight,width:rect.width,height:rect.height,painted:rect.width>0&&rect.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
  });
}`

async function visibleStateCheck(name,selector) {
  const samples=(await cdp.evaluate(`(${paintedContrastFunction})(${JSON.stringify(selector)})`)).filter(s=>s.painted)
  check(name,samples.length>0&&samples.every(s=>s.ratio>=s.minimum),{samples})
}
async function replyEnquiry(event,mode) {
  await cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:mode==='success'?200:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({success:mode==='success',message:'Browser audit intercepted this request; no enquiry was sent.'})).toString('base64')})
}
async function resolvePending(mode) {for(const event of pendingEnquiries.splice(0))await replyEnquiry(event,mode)}

async function processVisualStates() {
  for(const width of widths) {
    await viewport(width);await navigate('/')
    const mobile=width<=900
    for(let step=0;step<4;step++) {
      await click(`.process-step:nth-of-type(${step+1})`);await sleep(550)
      const samples=await cdp.evaluate(`(${paintedContrastFunction})('.process-step.is-active .step-dot b, .process-step.is-active .step-dot em')`)
      const painted=samples.filter(s=>s.painted)
      check(`Painted active process number and label remain readable at ${width}px, step ${step+1}`,painted.some(s=>s.text===String(step+1).padStart(2,'0'))&&painted.every(s=>s.ratio>=s.minimum),{width,step:step+1,samples})
      if(args.includes('--screenshots')&&[320,390,820,1440].includes(width))await detailScreenshot('/',width,`.process-step:nth-of-type(${step+1})`,`process-step-${step+1}`)
    }
    if(width<=620) {
      const rows=await cdp.evaluate(`[...document.querySelectorAll('.why-values .trust-value')].map(e=>({icon:e.querySelector('svg').getBoundingClientRect().left,text:e.querySelector('strong').getBoundingClientRect().left,padding:getComputedStyle(e).paddingLeft}))`)
      const aligned=rows.length>1&&rows.every(row=>Math.abs(row.icon-rows[0].icon)<1&&Math.abs(row.text-rows[0].text)<1)
      check(`Trust rows share icon and text alignment at ${width}px`,aligned,{width,rows})
      if(args.includes('--screenshots')&&[320,390].includes(width))await detailScreenshot('/',width,'.why-values-bar','trust-rows')
    } else if(width<=1100) {
      const rows=await cdp.evaluate(`[...document.querySelectorAll('.why-values .trust-value')].map(e=>({icon:e.querySelector('svg').getBoundingClientRect().left,text:e.querySelector('strong').getBoundingClientRect().left}))`)
      check(`Tablet trust rows align within each column at ${width}px`,rows.length===4&&Math.abs(rows[0].icon-rows[2].icon)<1&&Math.abs(rows[1].icon-rows[3].icon)<1&&Math.abs(rows[0].text-rows[2].text)<1&&Math.abs(rows[1].text-rows[3].text)<1,{width,rows})
    }
    if(!mobile)check(`Desktop process retains circular badges at ${width}px`,await cdp.evaluate(`getComputedStyle(document.querySelector('.step-dot')).borderRadius==='50%'`))
  }
}

async function controlStates(route,width,control,sample=control,focusTarget=control) {
  await cdp.evaluate(`document.querySelector(${JSON.stringify(control)})?.scrollIntoView({block:'center',behavior:'instant'})`)
  const root=await cdp.send('DOM.getDocument')
  const target=await cdp.send('DOM.querySelector',{nodeId:root.root.nodeId,selector:control})
  const focus=await cdp.send('DOM.querySelector',{nodeId:root.root.nodeId,selector:focusTarget})
  if(!target.nodeId||!focus.nodeId){check(`State sample exists ${route} ${control}`,false);return}
  for(const state of ['normal','hover','focus-visible']) {
    await cdp.send('CSS.forcePseudoState',{nodeId:target.nodeId,forcedPseudoClasses:state==='hover'?['hover']:[]})
    if(focus.nodeId!==target.nodeId)await cdp.send('CSS.forcePseudoState',{nodeId:focus.nodeId,forcedPseudoClasses:[]})
    if(state==='focus-visible') {
      await cdp.evaluate(`document.querySelector(${JSON.stringify(focusTarget)})?.focus({preventScroll:true})`)
      await cdp.send('CSS.forcePseudoState',{nodeId:focus.nodeId,forcedPseudoClasses:['focus','focus-visible']})
    }
    await sleep(450)
    const samples=(await cdp.evaluate(`(${paintedContrastFunction})(${JSON.stringify(sample)})`)).filter(s=>s.painted)
    check(`Visible text contrast ${route} ${width}px ${control} ${state}`,samples.length>0&&samples.every(s=>s.ratio>=s.minimum),{route,width,control,state,samples})
  }
  await cdp.send('CSS.forcePseudoState',{nodeId:target.nodeId,forcedPseudoClasses:[]})
  if(focus.nodeId!==target.nodeId)await cdp.send('CSS.forcePseudoState',{nodeId:focus.nodeId,forcedPseudoClasses:[]})
  await cdp.evaluate('document.activeElement?.blur()')
}

async function templateVisualStates() {
  await cdp.send('DOM.enable');await cdp.send('CSS.enable')
  const examples=[
    ['/',[['.branch-btn-primary'],['.branch-address a'],['.about-contact-value a'],['.gr-read-more'],['.gr-source-link'],['.faq-q'],['.faq-head .text-link'],['.footer-contact .contact-action']]],
    ['/commercial',[['.svc-note .text-link'],['.switch-band .outline-btn'],['.cta-band-btn']]],
    ['/service/metal-roofs-cladding',[['.sd-cta-row .inline-submit'],['.text-link-dark'],['.sd-other a']]],
    ['/blog',[['.blog-masthead-link'],['.blog-filters label:nth-child(2)','.blog-filters label:nth-child(2) span','.blog-filters label:nth-child(2) input'],['.blog-card h3 a']]],
    ['/blog/commercial-roof-maintenance',[['.blog-toc a'],['.blog-prose a'],['.blog-faq summary']]],
    ['/projects/remuera-villa-re-roof',[['.case-back'],['.case-text-link'],['.case-adjacent'],['.case-all-projects']]],
    ['/404',[['.btn-sage-accent'],['.btn-outline-charcoal'],['.not-found-card','.not-found-card .not-found-card-link'],['.not-found-phone-btn']]],
    ['/contact',[['.contact-info-content a'],['.contact-submit-btn']]],
    ['/social-preview.html',[['.tab-btn.active'],['.action-btn']]],
  ].filter(([route])=>!routes.length||routes.includes(route))
  for(const width of [390,1440])for(const [route,targets] of examples) {
    await viewport(width);await navigate(route);await revealPage()
    if(route==='/blog')await click('.blog-filters label:nth-child(2)')
    for(const [control,sample,focus] of targets) {
      const exists=await cdp.evaluate(`Boolean(document.querySelector(${JSON.stringify(control)}))`)
      if(exists)await controlStates(route,width,control,sample||control,focus||control)
      else check(`State sample exists ${route} ${control}`,false)
    }
    if(route==='/blog') {
      await input('#blog-search','zz-no-matching-roof-article-zz')
      await controlStates(route,width,'.blog-empty .blog-button')
      await click('.blog-empty .blog-button')
      check(`Blog empty state clears search and restores articles at ${width}px`,await cdp.evaluate(`!document.querySelector('.blog-empty')&&document.querySelector('#blog-search').value===''`))
    }
    if(route==='/projects/remuera-villa-re-roof') {
      for(let step=1;step<=6;step++) {
        const selector=`.case-timeline li:nth-child(${step})`
        if(!await cdp.evaluate(`document.querySelector(${JSON.stringify(selector+' details')}).open`))await click(selector+' summary')
        await visibleStateCheck(`Project open timeline number and heading readable at ${width}px step${step}`,`${selector} .case-stage-number,${selector} summary h3,${selector} .case-stage-date`)
      }
    }
  }
  if(args.includes('--template-control-only'))return
  for(const width of [1024,1200,1280,1440]) {
    await viewport(width);await navigate('/');await cdp.evaluate(`document.querySelector('#services').scrollIntoView({block:'start',behavior:'instant'})`);await sleep(400)
    if(width>=1200) {
      await controlStates('/',width,'.desktop-nav a')
      await controlStates('/',width,'.nav-dropdown-btn')
      await click('.nav-dropdown-btn')
      const samples=(await cdp.evaluate(`(${paintedContrastFunction})('.nav-dropdown-btn.active')`)).filter(s=>s.painted)
      check(`Scrolled desktop header active menu readable over light content at ${width}px`,samples.length>0&&samples.every(s=>s.ratio>=s.minimum),{samples})
      await key('Escape')
    }
    if(args.includes('--screenshots'))await screenshot('header-light-content',width,'',true)
  }
  await viewport(1440);await navigate('/');await revealPage()
  const branch=await cdp.evaluate(`({heading:document.querySelector('.branch-header h3').getBoundingClientRect().left,address:document.querySelector('.branch-address a').getBoundingClientRect().left,button:document.querySelector('.branch-btn-primary').getBoundingClientRect().left})`)
  check('Desktop branch heading address and actions share left alignment',Math.abs(branch.heading-branch.address)<1&&Math.abs(branch.heading-branch.button)<1,{branch})
}

async function main() {
  const response=await fetch(origin);if(!response.ok) throw new Error(`Preview returned ${response.status}`)
  const chrome=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync)
  if(!chrome) throw new Error('Installed Chrome or Edge not found')
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'arp-responsive-'))
  browser=spawn(chrome,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--hide-scrollbars','about:blank'],{stdio:'ignore',windowsHide:true})
  const portFile=path.join(profile,'DevToolsActivePort')
  let targets
  for(let i=0;i<300&&!targets;i++) {
    try {
      const port=fs.readFileSync(portFile,'utf8').split('\n')[0]
      if(/^\d+$/.test(port))targets=await (await fetch(`http://127.0.0.1:${port}/json`)).json()
      if(!targets?.some(t=>t.type==='page'))targets=undefined
    }catch{}
    if(!targets)await sleep(100)
  }
  if(!targets)throw new Error('Headless browser did not start')
  cdp=new CDP(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await cdp.connect()
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Network.enable')
  cdp.on('Runtime.exceptionThrown',data=>report.errors.push({context:currentContext,message:data.exceptionDetails?.exception?.description||data.exceptionDetails?.text}))
  // Always intercept the only submission endpoint, even during layout-only runs.
  await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*/api/enquiry',requestStage:'Request'},{urlPattern:'*/api/contact',requestStage:'Request'}]})
  cdp.on('Fetch.requestPaused',async event=>{report.enquiryRequestsIntercepted++;if(enquiryMode==='pending')pendingEnquiries.push(event);else await replyEnquiry(event,enquiryMode)})
  const screenshotRoutes=['/','/commercial','/residential','/service/metal-roofs-cladding','/contact','/blog','/blog/commercial-roof-maintenance','/projects/remuera-villa-re-roof','/privacy-policy','/terms-and-conditions','/404','/404.html','/social-preview.html']
  for(const route of pendingRoutes) {
    await viewport(widths[0]);await navigate(route)
    try {await revealPage()} catch {await navigate(route);await revealPage()}
    for(const width of widths) {
      currentContext=`${route} @ ${width}`
      await viewport(width);await sleep(180)
      let result=await cdp.evaluate(inspect)
      // Resizing or a development live reload can mount fresh reveal elements.
      // Exercise actual scrolling again; never force classes or hide failures.
      if(result.unrevealed.length) {await revealPage();result=await cdp.evaluate(inspect)}
      report.cases.push({route,width,...result})
      if(args.includes('--axe')) await axeAudit(currentContext)
      if(result.overflow.length||result.horizontalScroll||result.brokenImages.length||result.clipped.length||result.unrevealed.length) console.log('FINDING',currentContext,JSON.stringify({overflow:result.overflow.slice(0,5),clipped:result.clipped,unrevealed:result.unrevealed.length,broken:result.brokenImages}))
      if(args.includes('--screenshots')&&(routes.length||screenshotRoutes.includes(route))&&([320,768,1024,1440].includes(width)||args.includes('--reflow-200'))) {
        await screenshot(route,width)
        if(route==='/') for(const [selector,suffix] of [['#projects','projects'],['#testimonials','reviews'],['#contact','form'],['.site-footer','footer']]) await detailScreenshot(route,width,selector,suffix)
        if(route==='/contact') await detailScreenshot(route,width,'.contact-form-card','form')
      }
      if(args.includes('--screenshots')&&route==='/'&&width===3840) {
        await screenshot(route,width,'-hero',true)
        await detailScreenshot(route,width,'.site-footer','footer')
      }
    }
    console.log(`Checked ${route}: ${widths.length} widths`)
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2))
  }
  if(args.includes('--interactions')) await interactions()
  if(args.includes('--responsive-interactions')) await responsiveInteractions()
  if(args.includes('--media-interactions')) await mediaInteractions()
  if(args.includes('--static-interactions')) await staticInteractions()
  if(args.includes('--process-progress-only')) await processProgressChecks()
  if(args.includes('--process-visual-states')) await processVisualStates()
  if(args.includes('--template-visual-states')) await templateVisualStates()
  if(args.includes('--form-visual-states')&&!args.includes('--interactions'))await formInteractions()
  if(args.includes('--clear-state-screenshots'))await clearStateScreenshots()
  report.finishedAt=new Date().toISOString()
  report.summary={cases:report.cases.length,overflowCases:report.cases.filter(x=>x.overflow.length||x.horizontalScroll).length,clippedCases:report.cases.filter(x=>x.clipped.length).length,brokenImageCases:report.cases.filter(x=>x.brokenImages.length).length,unrevealedCases:report.cases.filter(x=>x.unrevealed.length).length,runtimeErrors:report.errors.length,interactionFailures:report.interactions.filter(x=>!x.pass).length}
  report.summary.accessibilityViolations=report.accessibility.reduce((sum,result)=>sum+result.violations.length,0)
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2))
  console.log(JSON.stringify(report.summary));console.log(`Report: ${path.join(output,'report.json')}`)
  if(Object.entries(report.summary).some(([key,value])=>key!=='cases'&&value>0)) process.exitCode=1
}
try { await main() } catch(error) { console.error(error);process.exitCode=1 } finally {
  if(cdp) await cdp.send('Browser.close').catch(()=>{});cdp?.close();browser?.kill()
  if(profile&&path.dirname(path.resolve(profile))===path.resolve(os.tmpdir())&&path.basename(profile).startsWith('arp-responsive-')) {
    await sleep(500);try {fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:250})} catch {console.warn('Temporary browser profile remains locked; browser has been closed:',profile)}
  }
}
