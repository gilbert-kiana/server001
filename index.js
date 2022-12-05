const express = require("express");

const app = express();
require("dotenv").config();
const cors = require("cors");

const axios = require("axios");

app.listen(process.env.PORT, () => {
  console.log(`Server is listening on port ${process.env.PORT}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//middleware function to generate token
const generateToken = async (req, res, next) => {
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const consumer = process.env.MPESA_CONSUMER_KEY;

  const auth = new Buffer.from(`${consumer}:${secret}`).toString("base64");

  await axios
    .get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        Headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    )
    .then((response) => {
      console.log(response.data);
      // token = response.data.access_token;
      next();
    })
    .catch((err) => {
      console.log(err);
      //res.status(400).json(err.message)
    });
};
app.get("/token", (req, res) => {
  generateToken();
});

app.post("/stk", generateToken, async (req, res) => {
  const phone = req.body.phone.substring(1);
  const amount = req.body.amount;

  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  const shortcode = process.env.SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;

  const password = Buffer.from(shortcode + passkey + timestamp).toString(
    "base64"
  );

  await axios
    .post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortcode,
        Password: password,

        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: `254${phone}`,
        PartyB: shortcode,
        PhoneNumber: `254${phone}`,
        CallBackURL: "https://mydomain.com/pat",
        AccountReference: `254${phone}`,
        TransactionDesc: "Test",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then((data) => {
      console.log(data);
      res.status(200).json(data);
    })
    .catch((err) => {
      console.log(err.message);
      res.status(400).json(err.message);
    });
});
