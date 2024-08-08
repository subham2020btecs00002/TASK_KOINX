const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const moment = require("moment");
const Trade = require("../models/Trade");

const isValidDate = (dateString) => {
  const formats = ["YYYY-MM-DD HH:mm:ss", "DD-MM-YYYY HH:mm"];
  for (let format of formats) {
    if (moment(dateString, format, true).isValid()) {
      return format;
    }
  }
  return null;
};

const uploadTrades = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  if (fileExtension !== ".csv") {
    fs.unlinkSync(req.file.path);
    return res
      .status(400)
      .json({ error: "Invalid file type. Please upload a CSV file." });
  }

  const filePath = req.file.path;
  const trades = [];
  let validTradesCount = 0;
  let invalidRowsCount = 0;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      try {
        const {
          UTC_Time,
          Operation,
          Market,
          "Buy/Sell Amount": BuySellAmount,
          Price,
        } = row;

        if (!UTC_Time || !Operation || !Market || !BuySellAmount || !Price) {
          invalidRowsCount++;
          throw new Error("Missing required fields");
        }
        if (parseFloat(BuySellAmount) <= 0 || parseFloat(Price) <= 0) {
          invalidRowsCount++;
          throw new Error("Buy/Sell Amount and Price must be positive numbers");
        }

        const dateFormat = isValidDate(UTC_Time);
        if (!dateFormat) {
          invalidRowsCount++;
          throw new Error("Invalid date format");
        }

        const validOperations = ["BUY", "SELL"];
        if (!validOperations.includes(Operation.toUpperCase())) {
          invalidRowsCount++;
          throw new Error("Invalid operation type");
        }

        const [BaseCoin, QuoteCoin] = Market.split("/");
        if (!BaseCoin || !QuoteCoin) {
          invalidRowsCount++;
          throw new Error("Invalid Market format");
        }

        const truncatedDate = moment(UTC_Time, dateFormat)
          .seconds(0)
          .milliseconds(0)
          .toDate();

        trades.push({
          UTC_Time: truncatedDate,
          Operation: Operation.toUpperCase(),
          Market,
          BuySellAmount: parseFloat(BuySellAmount),
          Price: parseFloat(Price),
          BaseCoin,
          QuoteCoin,
        });
        validTradesCount++;
      } catch (error) {
        console.error(
          `Error processing row: ${JSON.stringify(row)}, Error: ${
            error.message
          }`
        );
      }
    })
    .on("end", async () => {
      try {
        if (validTradesCount === 0) {
          return res
            .status(400)
            .json({ error: "No valid trade data found in the file" });
        }

        for (const trade of trades) {
          try {
            await Trade.updateOne(
              { UTC_Time: trade.UTC_Time, Market: trade.Market },
              { $set: trade },
              { upsert: true }
            );
          } catch (error) {
            console.error(
              `Error upserting trade: ${JSON.stringify(trade)}, Error: ${
                error.message
              }`
            );
          }
        }
        res.status(200).json({
          message: `File uploaded. Valid trades processed: ${validTradesCount}. Invalid rows skipped: ${invalidRowsCount}.`,
        });
      } catch (error) {
        console.error(`Error storing data in database: ${error.message}`);
        res.status(500).json({ error: "Error storing data in database" });
      } finally {
        fs.unlinkSync(filePath);
      }
    })
    .on("error", (error) => {
      console.error(`Error reading the file: ${error.message}`);
      res.status(500).json({ error: "Error reading the file" });
    });
};

const getBalances = async (req, res) => {
  const { timestamp } = req.body;

  if (!timestamp) {
    return res.status(400).json({ error: "Timestamp is required" });
  }

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: "Invalid timestamp format" });
  }

  try {
    const trades = await Trade.find({ UTC_Time: { $lt: date } });

    if (trades.length === 0) {
      return res.status(200).json({
        message: "No trades found before the given timestamp",
        balances: {},
      });
    }

    const balances = trades.reduce((acc, trade) => {
      const { BaseCoin, Operation, BuySellAmount } = trade;
      if (!acc[BaseCoin]) {
        acc[BaseCoin] = 0;
      }

      if (Operation === "BUY") {
        acc[BaseCoin] += BuySellAmount;
      } else if (Operation === "SELL") {
        acc[BaseCoin] -= BuySellAmount;
      }

      return acc;
    }, {});

    res.status(200).json(balances);
  } catch (error) {
    console.error(`Error calculating balances: ${error.message}`);
    res.status(500).json({ error: "Error calculating balances" });
  }
};

module.exports = {
  uploadTrades,
  getBalances,
};
