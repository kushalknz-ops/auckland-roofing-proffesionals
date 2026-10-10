/**
 * Authentic Google Reviews Data for Auckland Reliable Roofing
 * Source: https://www.google.com/search?q=Auckland+Reliable+Roofing+Wairau+Valley+reviews#lrd=0x272ec26c27931c1f:0x619a4bb865a44c42,1,,,,
 * Location: 59/7 Porana Road, Wairau Valley, Auckland 0627
 * Place ID: ChIJHxyTJ2zCLicRQkykZbhLmmE
 */

export interface GoogleReview {
  id: string
  authorName: string
  authorPhoto?: string
  authorInitials: string
  rating: number
  date: string
  relativeTime: string
  text: string
  googleReviewUrl?: string
  verified: boolean
}

export interface GoogleBusinessProfile {
  name: string
  rating: number
  totalReviews: number
  address: string
  placeId: string
  reviewsUrl: string
}

export const GOOGLE_BUSINESS_PROFILE: GoogleBusinessProfile = {
  name: 'Auckland Reliable Roofing',
  rating: 4.9,
  totalReviews: 36,
  address: '59/7 Porana Road, Wairau Valley, Auckland 0627',
  placeId: 'ChIJHxyTJ2zCLicRQkykZbhLmmE',
  reviewsUrl:
    'https://www.google.com/search?q=Auckland+Reliable+Roofing+Wairau+Valley+reviews#lrd=0x272ec26c27931c1f:0x619a4bb865a44c42,1,,,,',
}

export const AUTHENTIC_GOOGLE_REVIEWS: GoogleReview[] = [
  {
    id: 'rev-1',
    authorName: 'Steve Williams',
    authorInitials: 'SW',
    rating: 5,
    date: 'October 2024',
    relativeTime: 'Verified Google Review',
    text: 'Ruble and his team are very skilled and conscientious, and I would not hesitate to recommend them to anyone. We had our roof replaced, and they were very accommodating and helpful in coordinating with the other trades people. Excellent workmanship at a very reasonable price.',
    verified: true,
  },
  {
    id: 'rev-2',
    authorName: 'Preet Jakhu',
    authorInitials: 'PJ',
    rating: 5,
    date: 'November 2024',
    relativeTime: 'Verified Google Review',
    text: 'Really appreciated Rubal and his team installing the new roof for us in such a short time frame. These guys are awesome professionals! We are so happy about the quality roof and their workmanship. They installed our new roof easy and smoothly, highly recommend Rubal and his team for anyone who would like to have roofing service. Rubal responded quickly, answered all my questions patiently and provided great advice.',
    verified: true,
  },
  {
    id: 'rev-3',
    authorName: 'Aman Deep',
    authorInitials: 'AD',
    rating: 5,
    date: 'December 2024',
    relativeTime: 'Verified Google Review',
    text: 'The roof work looks fantastic! The craftsmanship is top-notch, with clean lines and perfect attention to detail. It is clear that the team took great care in ensuring durability and a flawless finish. Excellent job — this will definitely protect and enhance the property for years to come. Highly impressed.',
    verified: true,
  },
  {
    id: 'rev-4',
    authorName: 'Nick Leonard Beard',
    authorInitials: 'NB',
    rating: 5,
    date: 'January 2025',
    relativeTime: 'Verified Google Review',
    text: 'Unbelievably great customer service. Rubal arrived to site quickly, identified and remedied the issue in no time at all. Definitely recommend.',
    verified: true,
  },
  {
    id: 'rev-5',
    authorName: 'Baldev Singh',
    authorInitials: 'BS',
    rating: 5,
    date: 'September 2024',
    relativeTime: 'Verified Google Review',
    text: 'We experienced a roof leak and engaged Rubal to repair it. Their team arrived promptly and completed the work efficiently. Their excellent work and communication were highly commendable.',
    verified: true,
  },
  {
    id: 'rev-6',
    authorName: 'numcrun',
    authorInitials: 'NC',
    rating: 5,
    date: 'February 2025',
    relativeTime: 'Verified Google Review',
    text: 'We paid this company a large 5-figure deposit upfront for gutter repairs. They spent a whole day with a cherry picker doing further preparatory investigations. After this, they determined that the work would require expensive scaffolding. We decided to cancel. They promptly refunded all our deposit, with no charge for all the work they had done. Very impressive. You are in safe hands with this company.',
    verified: true,
  },
  {
    id: 'rev-7',
    authorName: 'Poonam Pandey',
    authorInitials: 'PP',
    rating: 5,
    date: 'August 2024',
    relativeTime: 'Verified Google Review',
    text: 'Top roofing services in Auckland. Quality and professional work.',
    verified: true,
  },
  {
    id: 'rev-8',
    authorName: 'Jonny',
    authorInitials: 'J',
    rating: 5,
    date: 'August 2024',
    relativeTime: 'Verified Review',
    text: 'Good Comms, arrived on time and completed work as per original quote. Worked alone and finished job in half the time estimated. Very polite and happy to take questions.',
    verified: true,
  },
]

