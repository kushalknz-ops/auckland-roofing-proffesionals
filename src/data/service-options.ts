/* Service <select> option sets shared by the quote modal and the inline form.
   Labels intentionally match the original static markup. */

export const SERVICE_OPTION_GROUPS: { label: string; options: string[] }[] = [
  {
    label: 'Commercial',
    options: [
      'Metal Roofs & Cladding',
      'Membrane Roofing (Commercial)',
      'Warm Roof Systems (Commercial)',
      'Roof Safety Systems',
      'Asset Maintenance',
    ],
  },
  {
    label: 'Residential',
    options: [
      'Asphalt Shingles',
      'Metal Roofs (Residential)',
      'Membrane Roofing (Residential)',
      'Warm Roof Systems (Residential)',
    ],
  },
]

export const OTHER_OPTION = 'Other / Not sure'

/** Map a service title (e.g. "Membrane Roofing") to its select option value,
    accounting for the "(Commercial | Residential)" suffixes. Values match the
    rendered option labels, which act as their own <option> values. */
export function optionValueForService(title: string): string {
  const strip = (t: string) => t.replace(/\s*\((Commercial|Residential)\)\s*$/, '')
  for (const g of SERVICE_OPTION_GROUPS) {
    const hit = g.options.find((o) => strip(o) === title)
    if (hit) return hit
  }
  return ''
}
