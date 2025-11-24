import { createCandidateData } from "./controller.js";

// Seed multiple dummy candidates
export const seedCandidates = async (req, res) => {
  try {
    const { count = 10 } = req.body; // Default to 10 candidates if not specified

    const roles = ["SDET", "QA", "DevOps", "Frontend", "Backend", "Full-stack"];
    const firstNames = [
      "John",
      "Jane",
      "Michael",
      "Sarah",
      "David",
      "Emily",
      "Robert",
      "Jessica",
      "William",
      "Ashley",
      "James",
      "Amanda",
      "Christopher",
      "Melissa",
      "Daniel",
      "Michelle",
      "Matthew",
      "Kimberly",
      "Anthony",
      "Amy",
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Wilson",
      "Anderson",
      "Thomas",
      "Taylor",
      "Moore",
      "Jackson",
      "Martin",
      "Lee",
    ];
    const skillsList = [
      ["JavaScript", "React", "Node.js"],
      ["Python", "Django", "PostgreSQL"],
      ["Java", "Spring Boot", "MySQL"],
      ["TypeScript", "Angular", "MongoDB"],
      ["C#", ".NET", "SQL Server"],
      ["Go", "Docker", "Kubernetes"],
      ["Ruby", "Rails", "Redis"],
      ["PHP", "Laravel", "MySQL"],
      ["Swift", "iOS", "Xcode"],
      ["Kotlin", "Android", "Firebase"],
    ];

    const createdCandidates = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        const firstName =
          firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName =
          lastNames[Math.floor(Math.random() * lastNames.length)];
        const name = `${firstName} ${lastName}`;
        const email = `candidate${Date.now()}-${i}@example.com`;
        const phone_no = `+1-555-${Math.floor(1000 + Math.random() * 9000)}`;
        const role = [roles[Math.floor(Math.random() * roles.length)]];
        const skills =
          skillsList[Math.floor(Math.random() * skillsList.length)];
        const experience = Math.floor(Math.random() * 15) + 1; // 1-15 years
        const bio = `Experienced ${role[0]} developer with ${experience} years of expertise in software development.`;
        const image = `https://i.pravatar.cc/150?img=${
          Math.floor(Math.random() * 70) + 1
        }`;
        const resume_url = `https://example.com/resumes/${email.replace(
          "@",
          "_at_"
        )}.pdf`;
        const social_links = {
          linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
          github: `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          portfolio: `https://${firstName.toLowerCase()}${lastName.toLowerCase()}.dev`,
        };

        const candidate = await createCandidateData({
          name,
          email,
          phone_no,
          image,
          skills,
          experience,
          resume_url,
          role,
          bio,
          is_active: true,
          social_links,
        });

        createdCandidates.push(candidate);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
        });
      }
    }

    res.status(201).json({
      message: `Successfully created ${createdCandidates.length} out of ${count} candidates`,
      created: createdCandidates.length,
      failed: errors.length,
      candidates: createdCandidates,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
