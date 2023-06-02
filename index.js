const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');

// bistrobossrestaurant
// EDSAKAdPB1Qyq0Hi

console.log(process.env.USER_ACCESS_TOKEN);
app.use(cors())
app.use(express.json())
app.get('/', (req, res) => {
    res.send('Bistroboss is comming')
})

// bistroBossCollection 
// bisrtoBossAllfood


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.BISTRO_BOSS__DB_USER_NAME}:${process.env.BISTRO_BOSS__DB_USER_PASSWORD}@cluster0.w8zzyxt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    console.log(authorization);
    if (!authorization) {
        return res.status(401).send({ error: true, message: "Unauthorize because no header" })
    }
    const token = authorization.split(" ")[1]
    jwt.verify(token, process.env.USER_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "Unauthorize weong header" })

        }
        req.decoded = decoded
        next()
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const foodCollection = client.db("bistroBossCollection").collection("bisrtoBossAllfood")
        const reviewCollection = client.db("bistroBossCollection").collection("reviewCollection")
        const cartCollection = client.db("bistroBossCollection").collection("Cartdb")
        const userCollection = client.db("bistroBossCollection").collection("userdb")
        // Jwt 
        app.post("/jwt", (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.USER_ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ token })
        })
        const verifyAdmin= async (req,res,next)=>{
            const email=req.decoded.email 
            const query={email:email}
            const user= await userCollection.findOne(query)
            if (user?.role !== "admin" && user?.role !== undefined && user?.role !== null) {
                return res.status(403).send({ error: true, message: "Forbidden" });
            }
            next()
        }
        // allFoodMenu 
        app.get("/allFoodMenu", async (req, res) => {
            const result = await foodCollection.find().toArray()
            res.send(result)
        })
        app.get("/review", async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        // cartCollection  
        app.post("/carts", async (req, res) => {
            const addedProduct = req.body
            console.log(addedProduct);
            const result = await cartCollection.insertOne(addedProduct)
            res.send(result)
        })
        app.get("/carts", verifyJwt,  async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'porviden access' })
            }

            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })

        app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })
        //user collection
        app.post("/users", async (req, res) => {
            const doc = req.body
            const query = { email: doc.email }
            const alraadyAddedUser = await userCollection.findOne(query)
            if (alraadyAddedUser) {
                res.send({ message: "User Already exixts" })
            }
            else {
                const result = await userCollection.insertOne(doc)
                res.send(result)

            }
        })
        app.get("/users", verifyJwt,verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })
        app.patch("/users/admin/:id", async (req, res) => {
            const id = req.params.id
            // const doc=req.body
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: "admin"
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        app.put("/users/removeAdmin/:id", async (req, res) => {
            const id = req.params.id
            const doc = req.body
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: doc.role
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        app.get("/user/admin/:email", verifyJwt, verifyAdmin, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ error: true, message: "Forbidden" })
            }
            const filter = { email: email }
            const user = await userCollection.findOne(filter)
            const result = { admin: user?.role === "admin" }
            res.send(result)
        })

        app.delete("/users/:id", async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(filter)
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);









app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})