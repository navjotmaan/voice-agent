// Function declarations for function/tool calling

export const searchUserMemory = {
  name: "search_user_memory",
  description:
    "Search the user's personal knowledge base for information about their goals, skills, projects, preferences, experiences, and other personal context. Use this whenever answering a question that requires specific knowledge about the user.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description:
          "A concise semantic search query describing the information needed from the user's memory."
      }
    },
    required: ["query"]
  }
};

export const searchWeb = {
  name: "search_web",
  description:
    "Search the web for current information about any topic.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The web search query."
      }
    },
    required: ["query"]
  }
};

export const findJobs = {
  name: "find_jobs",
  description:
    "Find current job opportunities matching the user's skills, experience, location, and preferences.",
  parameters: {
    type: "OBJECT",
    properties: {
      keywords: {
        type: "STRING",
        description: "Job role or technical skills to search for."
      },
      location: {
        type: "STRING",
        description: "Desired job location."
      },
      experience: {
        type: "STRING",
        description: "Experience level such as fresher, junior, or internship."
      },
      remote: {
        type: "BOOLEAN",
        description: "Whether remote jobs are preferred."
      }
    },
    required: ["keywords", "experience"]
  }
};