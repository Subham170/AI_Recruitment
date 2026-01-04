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

/**
 * Calculate cosine similarity between two vectors
 * This works with self-hosted MongoDB (not just Atlas)
 */
function buildCosineSimilarityPipeline(queryVector, vectorField = "vector") {
  // Calculate magnitude of query vector (constant)
  const queryMagnitude = Math.sqrt(
    queryVector.reduce((sum, val) => sum + val * val, 0)
  );

  // Build the dot product calculation by creating an array of products
  // and summing them: sum(vector[i] * queryVector[i] for all i)
  const productExpressions = queryVector.map((val, idx) => ({
    $multiply: [{ $arrayElemAt: [`$${vectorField}`, idx] }, val],
  }));

  return [
    {
      $match: {
        [vectorField]: { $exists: true, $ne: null, $type: "array" },
        $expr: { $eq: [{ $size: `$${vectorField}` }, queryVector.length] },
      },
    },
    {
      $addFields: {
        // Calculate dot product by summing element-wise products
        dotProduct: {
          $sum: productExpressions,
        },
        // Calculate magnitude of document vector
        docMagnitude: {
          $sqrt: {
            $reduce: {
              input: `$${vectorField}`,
              initialValue: 0,
              in: { $add: ["$$value", { $multiply: ["$$this", "$$this"] }] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        // Calculate cosine similarity
        score: {
          $cond: {
            if: { $gt: ["$docMagnitude", 0] },
            then: {
              $divide: ["$dotProduct", { $multiply: [queryMagnitude, "$docMagnitude"] }],
            },
            else: 0,
          },
        },
      },
    },
    {
      $match: {
        score: { $gte: 0.3 }, // Minimum similarity score
      },
    },
    {
      $sort: { score: -1 },
    },
  ];
}

async function searchCandidates(jobDescription) {
  await client.connect();
  const db = client.db("AI-Recruitment");
  const collection = db.collection("candidates");

  // 1. Create embedding for JD
  const jdEmbedding = await getEmbedding(jobDescription);

  // 2. Perform vector search using cosine similarity (works with self-hosted MongoDB)
  const pipeline = [
    ...buildCosineSimilarityPipeline(jdEmbedding, "vector"),
    {
      $match: {
        experience: { $gte: 5 },
      },
    },
    { $limit: 5 },
  ];

  const results = await collection.aggregate(pipeline).toArray();

 results.forEach(result => {
    console.log("id: ", result._id);
  console.log(`Name: ${result.name}`);
  console.log(`Bio: ${result.bio}`);
  console.log(`Skills: ${result.skills?.join(", ") ?? ""}`);
  console.log(`Experience: ${result.experience} years`);
  console.log(`Score: ${result.score}`);
  console.log("-------------------");
 });
}

searchCandidates("Looking for a DevOps developer");
