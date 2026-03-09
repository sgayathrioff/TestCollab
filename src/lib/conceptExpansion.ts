// Simple dictionary for expanding search terms
// This acts as a lightweight "AI" by mapping intent to technical skills

const CONCEPT_MAP: Record<string, string[]> = {
  // Frontend / UI
  "interface": ["UI", "UX", "Figma", "Design", "Frontend", "CSS", "React", "Tailwind"],
  "ui": ["Interface", "Design", "Figma", "Frontend", "CSS"],
  "ux": ["User Experience", "Research", "Figma", "Product Design"],
  "frontend": ["React", "Vue", "Angular", "JavaScript", "TypeScript", "CSS", "HTML"],
  "website": ["Web", "Frontend", "Fullstack", "React", "Next.js"],
  
  // Backend / Data
  "backend": ["Node.js", "Python", "API", "Database", "SQL", "PostgreSQL", "Server"],
  "api": ["Backend", "Node.js", "REST", "GraphQL", "Express"],
  "database": ["SQL", "PostgreSQL", "MongoDB", "Supabase", "Firebase"],
  "data": ["Analytics", "Python", "SQL", "Pandas", "Visualization"],

  // Mobile
  "mobile": ["iOS", "Android", "React Native", "Flutter", "Swift", "Kotlin"],
  "app": ["Mobile", "iOS", "Android", "React Native"],

  // Roles
  "designer": ["UI", "UX", "Figma", "Branding", "Illustrator", "Photoshop"],
  "developer": ["Coding", "Programming", "Software Engineer", "Fullstack"],
  "manager": ["Product Management", "Agile", "Scrum", "Leadership"],
  
  // General
  "fast": ["Performance", "Optimization"],
  "secure": ["Security", "Auth", "OAuth"],
};

const STOP_WORDS = new Set(["a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "and", "or", "is", "are", "am", "i", "need", "want", "looking", "search", "find", "someone", "good", "bad", "experienced", "skilled"]);

export function expandSearchQuery(query: string): string[] {
  const words = query.toLowerCase().split(/[^a-zA-Z0-9]+/); // Split by non-alphanumeric
  const expandedTerms = new Set<string>();

  words.forEach(word => {
    if (word.length < 2 || STOP_WORDS.has(word)) return;
    
    expandedTerms.add(word); // Always include the original word

    // Check for direct matches in our dictionary
    if (CONCEPT_MAP[word]) {
      CONCEPT_MAP[word].forEach(term => expandedTerms.add(term));
    }
    
    // Check for partial matches (e.g. "designing" -> "designer" logic simplified)
    // Simple plural check
    const singular = word.endsWith('s') ? word.slice(0, -1) : word;
    if (CONCEPT_MAP[singular]) {
      CONCEPT_MAP[singular].forEach(term => expandedTerms.add(term));
    }
  });

  return Array.from(expandedTerms);
}
