const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors')
const connectDB = require("./config/db");
const tradeRoutes = require("./routes/tradeRoutes");
require("dotenv").config();

const app = express();
const PORT = 3001;


app.use(cors());

app.use(bodyParser.json());


app.get("/",(req,res) => {
    res.json({message: "Hello from Subham"});
})
app.use(bodyParser.urlencoded({ extended: true }));

connectDB();

app.use("/api/trades", tradeRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
