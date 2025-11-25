import { pipeline } from "@xenova/transformers";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI 
if (!uri) throw new Error("MONGODB_URI is not set");
const client = new MongoClient(uri);
let extractor = null;

async function getEmbedding(text) {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

async function embedAllCandidates() {
    await client.connect();
    const db = client.db("AI-Recruitment");
    const collection = db.collection("candidates");
  
    const allCandidates = await collection.find({}).toArray();
  
    for (const c of allCandidates) {
      // Choose what text you want to embed
      const text =
        `${c.name}. ${c.bio ?? ""}. Skills: ${c.skills?.join(", ") ?? ""}`;
  
      const embedding = await getEmbedding(text);
  
      await collection.updateOne(
        { _id: c._id },
        { $set: { vector: embedding } }
      );
  
      console.log("Updated:", c.name);
    }
  
    console.log("All candidates updated with vector embeddings.");
  }

// embedAllCandidates();

async function searchCandidates(jobDescription) {
  await client.connect();
  const db = client.db("AI-Recruitment");
  const collection = db.collection("candidates");

  // 1. Create embedding for JD
  const jdEmbedding = await getEmbedding(jobDescription);

  // 2. Perform vector search + filters
  const results = await collection
    .aggregate([
      {
        $vectorSearch: {
          index: "candidate_job_posting_index",
          path: "vector",
          queryVector: jdEmbedding,
          numCandidates: 10,
          limit: 10, // Get more candidates for filtering
        },
      },
      {
        $match: {
          experience: { $gte: 5 },
        },
      },
      { $limit: 5 },
    ])
    .toArray();

 results.forEach(result => {
    console.log("id: ", result._id);
  console.log(`Name: ${result.name}`);
  console.log(`Bio: ${result.bio}`);
  console.log(`Skills: ${result.skills?.join(", ") ?? ""}`);
  console.log(`Experience: ${result.experience} years`);
  console.log("-------------------");
 });
}

searchCandidates("Looking for a DevOps developer");
