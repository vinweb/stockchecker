"use strict";
const axios = require("axios");
const mongoose = require("mongoose");
const { Schema } = mongoose;
require("./db-connection");

const Stock = mongoose.model(
    "Stock",
    new Schema({
        stockData: {
            stock: String,
            price: Number,
            likes: { type: Number, default: 0 },
        },
    })
);

module.exports = function (app) {
    app.route("/api/stock-prices").get(function (req, res) {
        //console.log(req.query);
        let url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${req.query.stock}/quote`;
        axios
            .get(url)
            .then(function (response) {
                let stock = new Stock({
                    stockData: {
                        stock: req.query.stock,
                        price: response.data.latestPrice,
                        likes: 1,
                    },
                });
                stock.save((err, doc) => {
                    res.json({
                        stock: doc.stockData.stock,
                        price: doc.stockData.price,
                    });
                });
            })
            .catch(function (error) {
                // handle error
                console.log(error);
            });
    });
};
