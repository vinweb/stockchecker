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
        console.log(req.ip);
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

                    let filter = {
                        stock: name,
                    };
                    //console.log(filter);
                    let update = () => {
                        if (req.query.like) {
                            return {
                                $set: {
                                    stock: name,
                                },
                                $inc: { likes: 1 },
                                $push: { ips: ip },
                            };
                            //let vanip = Stock.find({ ips: ip });
                            /* let vanip2 = function (ip, done) {
                                Stock.find({ ips: ip }, (err, person) => {
                                    if (err) return console.log(err);
                                    done(null, person);
                                });
                            }; */
                            //let vanip2 = Stock.find({ ips: ip }).toArray();
                            //console.log(vanip2);
                            /*  Stock.find({ ips: ip }, (err, result) => {
                                if (err) {
                                    console.log(err);
                                }
                                if (result.length > 0) {
                                    console.log(
                                        "Ezzel az IP-vel már nem lehet több like."
                                    );
                                } else {
                                    console.log(3);
                                    return {
                                        $set: {
                                            stock: name,
                                        },
                                        $inc: { likes: 1 },
                                        $push: { ips: ip },
                                    };
                                }
                            }); */
                        } else {
                            return {
                                $set: {
                                    stock: name,
                                },
                                $push: { ips: ip },
                            };
                        }
                    };
                    let stockNoLike = new Stock({
                        stock: name,
                    });
                    let stockWithLike = new Stock({
                        stock: name,
                        likes: 1,
                        ips: ip,
                    });

                    Stock.findOneAndUpdate(
                        filter,
                        update(),
                        { new: true },
                        (err, updatedDoc) => {
                            //console.log(updatedDoc);
                            if (err) return console.log(err);
                            // Ha nincs ilyen stock a db-ben, mentse:
                            if (!updatedDoc && !req.query.like) {
                                console.log("nincs like");
                                stockNoLike.save((err, doc) => {
                                    res.json({
                                        stockData: {
                                            stock: doc.stock,
                                            price: price,
                                            likes: doc.likes,
                                        },
                                    });
                                });
                            } else if (!updatedDoc && req.query.like) {
                                console.log("van like");
                                stockWithLike.save((err, doc) => {
                                    res.json({
                                        stockData: {
                                            stock: doc.stock,
                                            price: price,
                                            likes: doc.likes,
                                        },
                                    });
                                });
                            } else {
                                // Ha van ilyen stock a db-ben, frissítette:
                                console.log("van már ilyen");
                                res.json({
                                    stockData: {
                                        stock: updatedDoc.stock,
                                        price: price,
                                        likes: updatedDoc.likes,
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
        }
    });
};
