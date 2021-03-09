"use strict";
const axios = require("axios");
const mongoose = require("mongoose");
const { Schema } = mongoose;
require("./db-connection");

const Stock = mongoose.model(
    "Stock",
    new Schema({
        stock: String,
        likes: { type: Number, default: 0 },
        ips: Array,
    })
);

module.exports = function (app) {
    app.route("/api/stock-prices").get(function (req, res) {
        let ip = req.ip;
        if (Array.isArray(req.query.stock)) {
            console.log(req.query.stock);
        } else {
            let nameToUrl = req.query.stock.toLowerCase();
            let name = req.query.stock.toUpperCase();
            let url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${nameToUrl}/quote`;

            axios
                .get(url)
                .then(function (response) {
                    // Ha nincs ilyen stock a felhőben:
                    if (response.data === "Unknown symbol") {
                        return res.json({
                            data: "Unknown symbol",
                        });
                    }
                    let price = response.data.latestPrice;
                    // Van-e like?
                    if (req.query.like) {
                        Stock.exists({ stock: name }, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                            if (result) {
                                Stock.find(
                                    { $and: [{ stock: name }, { ips: ip }] },
                                    (err, result) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                        console.log(
                                            "Volt már ilyen IP-vel like."
                                        );
                                        if (result.length > 0) {
                                            res.json({
                                                stockData: {
                                                    stock: result[0].stock,
                                                    price: price,
                                                    likes: result[0].likes,
                                                },
                                            });
                                        } else {
                                            console.log(
                                                "Még nem volt ilyen IP-vel like."
                                            );
                                            Stock.findOneAndUpdate(
                                                { stock: name },
                                                {
                                                    $inc: { likes: 1 },
                                                    $push: { ips: ip },
                                                },
                                                { new: true },
                                                (err, updatedDoc) => {
                                                    res.json({
                                                        stockData: {
                                                            stock:
                                                                updatedDoc.stock,
                                                            price: price,
                                                            likes:
                                                                updatedDoc.likes,
                                                        },
                                                    });
                                                }
                                            );
                                        }
                                    }
                                );
                            }
                            if (!result) {
                                console.log("Van like, nincs doc.");
                                let stockWithLike = new Stock({
                                    stock: name,
                                    likes: 1,
                                    ips: ip,
                                });
                                stockWithLike.save((err, doc) => {
                                    res.json({
                                        stockData: {
                                            stock: doc.stock,
                                            price: price,
                                            likes: doc.likes,
                                        },
                                    });
                                });
                            }
                        });
                    } else {
                        Stock.exists({ stock: name }, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                            if (result) {
                                console.log("Nincs like, van már doc.");
                                Stock.findOne({ stock: name }, (err, doc) => {
                                    res.json({
                                        stockData: {
                                            stock: doc.stock,
                                            price: price,
                                            likes: doc.likes,
                                        },
                                    });
                                });
                            }
                            if (!result) {
                                console.log("Nincs like, nincs doc.");
                                let stockNoLike = new Stock({
                                    stock: name,
                                });
                                stockNoLike.save((err, doc) => {
                                    res.json({
                                        stockData: {
                                            stock: doc.stock,
                                            price: price,
                                            likes: doc.likes,
                                        },
                                    });
                                });
                            }
                        });
                    }
                })
                .catch(function (error) {
                    // handle error
                    console.log(error);
                });
        }
    });
};
