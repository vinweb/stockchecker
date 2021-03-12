"use strict";
const axios = require("axios");
const mongoose = require("mongoose");
const { then } = require("./db-connection");
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
        const ip = req.ip;

        async function stockProcessor(name) {
            const stockExists = await Stock.exists({
                stock: name,
            });
            const stockExistsWithIp = await Stock.exists({
                $and: [{ stock: name }, { ips: ip }],
            });

            // Nincs like, nincs doc
            if (!stockExists && !req.query.like) {
                console.log("Nincs like, nincs doc");
                let stockNoLike = new Stock({
                    stock: name,
                });
                await stockNoLike.save();
            }

            // Nincs like, van doc
            if (stockExists && !req.query.like) {
                console.log("Nincs like, van doc");
            }

            // Van like, nincs doc
            if (!stockExists && req.query.like) {
                console.log("Van like, nincs doc");
                let stockWithLike = new Stock({
                    stock: name,
                    likes: 1,
                    ips: ip,
                });
                await stockWithLike.save();
            }

            // Van like, van doc, nincs IP
            if (stockExists && !stockExistsWithIp && req.query.like) {
                console.log("Van like, van doc, nincs IP: " + ip);

                await Stock.findOneAndUpdate(
                    { stock: name },
                    {
                        $inc: { likes: 1 },
                        $push: { ips: ip },
                    }
                );
            }
        }

        if (Array.isArray(req.query.stock)) {
            const [name1, name2] = req.query.stock;
            const name1ToUrl = name1.toLowerCase();
            const name2ToUrl = name2.toLowerCase();
            const url1 = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${name1ToUrl}/quote`;
            const url2 = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${name2ToUrl}/quote`;
            const requestOne = axios.get(url1);
            const requestTwo = axios.get(url2);

            axios
                .all([requestOne, requestTwo])
                .then(
                    axios.spread(async (...responses) => {
                        try {
                            for (let i = 0; i < 2; i++) {
                                let name = req.query.stock[i].toUpperCase();
                                await stockProcessor(name);
                            }
                            await Stock.find(
                                {
                                    $or: [
                                        {
                                            stock: req.query.stock[0].toUpperCase(),
                                        },
                                        {
                                            stock: req.query.stock[1].toUpperCase(),
                                        },
                                    ],
                                },
                                (err, document) => {
                                    if (err) return console.error(err);
                                    return res.json({
                                        stockData: [
                                            {
                                                stock: document[0].stock,
                                                price:
                                                    responses[0].data
                                                        .latestPrice,
                                                rel_likes:
                                                    document[0].likes -
                                                    document[1].likes,
                                            },
                                            {
                                                stock: document[1].stock,
                                                price:
                                                    responses[1].data
                                                        .latestPrice,
                                                rel_likes:
                                                    document[1].likes -
                                                    document[0].likes,
                                            },
                                        ],
                                    });
                                }
                            );
                        } catch (err) {
                            console.log(err);
                        }
                    })
                )
                .catch((errors) => {
                    console.log(errors);
                });
        } else {
            const name = req.query.stock.toUpperCase();
            const nameToUrl = req.query.stock.toLowerCase();
            const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${nameToUrl}/quote`;

            axios
                .get(url)
                .then(async function (response) {
                    let price = response.data.latestPrice;

                    try {
                        await stockProcessor(name);

                        await Stock.findOne(
                            { stock: name },
                            (err, document) => {
                                if (err) return console.error(err);
                                return res.json({
                                    stockData: {
                                        stock: document.stock,
                                        price: price,
                                        likes: document.likes,
                                    },
                                });
                            }
                        );
                    } catch (err) {
                        console.log(err);
                    }
                })
                .catch(function (error) {
                    // handle error
                    console.log(error);
                });
        }
    });
};
