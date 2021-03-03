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
                // Ha nincs ilyen stock a felhőben:
                if (response.data === "Unknown symbol") {
                    return res.json({
                        data: "Unknown symbol",
                    });
                }
                let filter = {
                    "stockData.stock": req.query.stock,
                };
                let update = () => {
                    if (req.query.like) {
                        return {
                            $set: {
                                "stockData.stock": req.query.stock.toUpperCase(),
                                "stockData.price": response.data.latestPrice,
                            },
                            $inc: { "stockData.likes": 1 },
                        };
                    } else {
                        return {
                            $set: {
                                "stockData.stock": req.query.stock.toUpperCase(),
                                "stockData.price": response.data.latestPrice,
                            },
                        };
                    }
                };
                let stockNoLike = new Stock({
                    stockData: {
                        stock: req.query.stock.toUpperCase(),
                        price: response.data.latestPrice,
                    },
                });
                let stockWithLike = new Stock({
                    stockData: {
                        stock: req.query.stock.toUpperCase(),
                        price: response.data.latestPrice,
                        likes: 1,
                    },
                });
                Stock.findOneAndUpdate(
                    filter,
                    update(),
                    { new: true },
                    (err, updtatedDoc) => {
                        if (err) return console.log(err);
                        // Ha nincs ilyen stock a db-ben, mentse:
                        if (!updtatedDoc && !req.query.like) {
                            stockNoLike.save((err, doc) => {
                                res.json({
                                    stockData: {
                                        stock: doc.stockData.stock,
                                        price: doc.stockData.price,
                                        likes: doc.stockData.likes,
                                    },
                                });
                            });
                        } else if (!updtatedDoc && req.query.like) {
                            stockWithLike.save((err, doc) => {
                                res.json({
                                    stockData: {
                                        stock: doc.stockData.stock,
                                        price: doc.stockData.price,
                                        likes: doc.stockData.likes,
                                    },
                                });
                            });
                        } else {
                            // Ha van ilyen stock a db-ben, frissítette:
                            res.json({
                                stockData: {
                                    stock: updtatedDoc.stockData.stock,
                                    price: updtatedDoc.stockData.price,
                                    likes: updtatedDoc.stockData.likes,
                                },
                            });
                        }
                    }
                );
            })
            .catch(function (error) {
                // handle error
                console.log("Ilyen nincs.");
            });
    });
};
