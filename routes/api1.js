"use strict";
const axios = require("axios");
const mongoose = require("mongoose");
const { Schema } = mongoose;
require("./db-connection");

const Stock = mongoose.model(
    "Stock",
    new Schema({
        stock: String,
        price: Number,
        likes: { type: Number, default: 0 },
    })
);

module.exports = function (app) {
    app.route("/api/stock-prices").get(function (req, res) {
        //console.log(req.query);
        const stockProcessor = (name) => {
            let nameToUrl = name.toLowerCase();
            //console.log(name);
            let url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${nameToUrl}/quote`;
            //console.log(url);
            axios
                .get(url)
                .then(function (response) {
                    //console.log("name");
                    // Ha nincs ilyen stock a felhőben:
                    if (response.data === "Unknown symbol") {
                        return res.json({
                            data: "Unknown symbol",
                        });
                    }
                    let price = response.data.latestPrice;
                    let filter = {
                        stock: name,
                    };
                    let update = () => {
                        if (req.query.like) {
                            return {
                                $set: {
                                    stock: name.toUpperCase(),
                                },
                                $inc: { likes: 1 },
                            };
                        } else {
                            return {
                                $set: {
                                    stock: name.toUpperCase(),
                                },
                            };
                        }
                    };
                    let stockNoLike = new Stock({
                        stock: name.toUpperCase(),
                    });
                    let stockWithLike = new Stock({
                        stock: name.toUpperCase(),
                        likes: 1,
                    });
                    Stock.findOneAndUpdate(
                        filter,
                        update(),
                        { new: true },
                        (err, updatedDoc) => {
                            if (err) return console.log(err);
                            // Ha nincs ilyen stock a db-ben, mentse:
                            if (!updatedDoc && !req.query.like) {
                                //stockNoLike.save();
                                stockNoLike.save((err, doc) => {
                                    res.json({
                                        stockData: {
                                            stock: doc.stockData.stock,
                                            price: price,
                                            likes: doc.stockData.likes,
                                        },
                                    });
                                });
                            }
                            if (!updatedDoc && req.query.like) {
                                //stockWithLike.save();
                                stockWithLike.save((err, doc) => {
                                    res.json({
                                        stockData: {
                                            stock: doc.stockData.stock,
                                            price: price,
                                            likes: doc.stockData.likes,
                                        },
                                    });
                                });
                            } else {
                                // Ha van ilyen stock a db-ben, frissítette:
                                res.json({
                                    stockData: {
                                        stock: updtatedDoc.stockData.stock,
                                        price: price,
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
        };

        if (Array.isArray(req.query.stock)) {
            console.log(req.query.stock);
            let stocksArray = [];
            let objektum = {};
            Stock.find(
                {
                    $and: [
                        { "stockData.stock": req.query.stock[0] },
                        //{ "stockData.stock": req.query.stock[1] },
                    ],
                },
                (err, doc) => {
                    console.log(doc);
                }
            );
            //console.log(stocksArray);
            //for (let name of req.query.stock) {
            //stockProcessor(name);

            /* function retrieveUser(name, callback) {
                    Stock.findOne(
                        { "stockData.stock": name },
                        function (err, doc) {
                            if (err) {
                                callback(err, null);
                            } else {
                                callback(null, doc);
                            }
                        }
                    );
                } */

            /* retrieveUser(name, function (err, doc) {
                    if (err) {
                        console.log(err);
                    }
                    return stocksArray.push(doc);
                    // do something with user
                }); */
            //Stock.findOne({ "stockData.stock": name }, function (err, doc) {
            /* objektum = {
                        stock: doc.stockData.stock,
                        price: doc.stockData.price,
                        likes: doc.stockData.likes,
                    }; */
            //console.log(objektum);
            //stocksArray.push(objektum);
            //});
            // }
        } else {
            //console.log(req.query.stock);
            const name = req.query.stock.toUpperCase();
            //
            //stockProcessor(name);
            //console.log("name");

            Stock.findOne({ stock: name }, function (err, doc) {
                if (!doc) {
                    stockProcessor(name);
                } else {
                    console.log(doc);
                }
                console.log("Van: " + doc);
                /* res.json({
                    stockData: {
                        stock: doc.stock,
                        price: doc.price,
                        likes: doc.likes,
                    },
                }); */
            });
            Stock.findOne({ stock: "WWW" }, function (err, doc) {
                console.log("Van mostmár: " + doc);
            });
        }
    });
};
