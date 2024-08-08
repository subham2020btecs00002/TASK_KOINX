const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    UTC_Time: {
      type: Date,
      required: [true, "UTC Time is required"],
      validate: {
        validator: (v) => !isNaN(Date.parse(v)),
        message: (props) => `${props.value} is not a valid date`,
      },
    },
    Operation: {
      type: String,
      required: [true, "Operation is required"],
      enum: ["BUY", "SELL"],
      uppercase: true,
    },
    Market: {
      type: String,
      required: [true, "Market is required"],
      match: /^[A-Z]+\/[A-Z]+$/,
    },
    BuySellAmount: {
      type: Number,
      required: [true, "Buy/Sell Amount is required"],
      min: [0, "Amount must be a positive number"],
    },
    Price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a positive number"],
    },
    BaseCoin: {
      type: String,
      required: [true, "Base Coin is required"],
      uppercase: true,
    },
    QuoteCoin: {
      type: String,
      required: [true, "Quote Coin is required"],
      uppercase: true,
    },
  },
  { timestamps: true }
);

tradeSchema.index({ UTC_Time: 1, Market: 1 }, { unique: true });

const Trade = mongoose.model("Trade", tradeSchema);

module.exports = Trade;
