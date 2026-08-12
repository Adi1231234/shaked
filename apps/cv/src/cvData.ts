export type CVData = {
  firstName: string;
  lastName: string;
  role: string;
  contact: {
    phone: string;
    email: string;
    location: string;
    maritalStatus: string;
    birthInfo: string;
  };
  languages: readonly string[];
  strengths: readonly string[];
  futurePlants: readonly string[];
  profile: {
    paragraphs: readonly string[];
  };
  workExperience: readonly string[];
  education: readonly {
    date: string;
    place: string;
    details: string;
    bullets: readonly string[];
  }[];
  military: readonly {
    title: string;
    date: string;
    bullets: readonly string[];
  }[];
  volunteering: readonly string[];
  labels: {
    profile: string;
    aboutMe: string;
    education: string;
    workExperience: string;
    militaryService: string;
    strengths: string;
    languages: string;
    futurePlans: string;
    volunteering: string;
    contact: string;
    curriculumVitae: string;
    present: string;
    contactLabels: {
      phone: string;
      email: string;
      location: string;
      status: string;
      origin: string;
    };
  };
};

export const cvData: CVData = {
  firstName: "Shaked",
  lastName: "Ashur",
  role: "Medical Student",

  contact: {
    phone: "050-3007469",
    email: "shaked28th@gmail.com",
    location: "Be'er Sheva, Israel",
    maritalStatus: "Single",
    birthInfo: "Birth year- 1999, Tel-Aviv",
  },

  languages: ["Hebrew", "English"],

  strengths: [
    "Coping with stressful situations",
    "Human Relations",
    "Striving for excellence",
    "Fast learner, adaptable to change",
  ],

  futurePlants: [
    "Higher education in the humanities",
    "Research work in science",
  ],

  profile: {
    paragraphs: [
      "Med student at Ben-Gurion University in the Negev, currently in my third year. Graduate of IDF’s 8200 combat unit, human resources officer and commander in officers' course.",
      "Responsible, strives for excellence, great human relations, works well under pressure and workload.",
    ],
  },

  workExperience: [
    "Chemistry Teaching assistant for Medical Students, Ben-Gurion University",
    "Bioinformatics Lab Assistant at Tel Aviv University",
    "Boarding school guide at the Israeli Sciences and Arts Academy in Jerusalem",
    "Secretary in an accountant's office",
    "Private tutor in math and science",
    "Exam supervisor at the Ministry of Education",
  ],

  education: [
    {
      date: "2014-2017",
      place: "Israeli Arts and Sciences Academy:",
      details: "majored in chemistry and biology.",
      bullets: ["Graduation with honors."],
    },
    {
      date: "2023-Present",
      place: "Medical studies at Ben-Gurion University of the Negev.",
      details: "",
      bullets: [],
    },
  ],

  military: [
    {
      title: "8200 Field Operative Unit",
      date: "2018-2020",
      bullets: [
        "Part of a pioneering team of women fighters in the IDF.",
        "Utilizing advanced military technological systems for special operations.",
        "Excellent teamwork and decision-making in stressful situations.",
      ],
    },
    {
      title: "Officer training",
      date: "2019-2020",
      bullets: [
        "Officers course in BHD1.",
        "Special training for intelligence officers.",
      ],
    },
    {
      title: "HR Analytics Officer in 8200",
      date: "2020-2021",
      bullets: [
        "Strategic management of all career soldiers in 8200 unit.",
        "Commanding experience, guidance of colleagues, working with senior officials, standing under pressure and workload.",
      ],
    },
    {
      title: "Team Commander in Officers Training course, BHD 1",
      date: "2021-2022",
      bullets: [
        "Commanding and guiding cadets in their training to become officers.",
        "Devising new seminar content, excellent at public speaking.",
        "Adaptation to change and creative thinking.",
      ],
    },
    {
      title: "Reserve Service",
      date: "2022-2024",
      bullets: [
        "Professional Officers Course - Training Officer",
        "8200 Special Unit",
      ],
    },
  ],

  volunteering: [
    "Nefesh Yehudi Fellowship",
    "Director of newsletter and graduation conference at the Alumot association",
    "Hod Jerusalem nursing department",
    "Independent volunteering with Holocaust survivors",
    "Instructor in youth movements",
  ],

  labels: {
    profile: "Personal Profile",
    aboutMe: "About Me",
    education: "Education",
    workExperience: "Work Experience",
    militaryService: "Military Service",
    strengths: "Strengths",
    languages: "Languages",
    futurePlans: "Future Plans",
    volunteering: "Volunteering",
    contact: "Contact",
    curriculumVitae: "Curriculum Vitae",
    present: "Present",
    contactLabels: {
      phone: "Phone",
      email: "Email",
      location: "Location",
      status: "Status",
      origin: "Origin",
    },
  },
};
