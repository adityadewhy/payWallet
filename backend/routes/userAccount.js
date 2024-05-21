const express = require("express");
const router = express.Router();
import {User, userAccount} from "../db";
const {authMiddleware} = require("../middleware");
const z = require("zod");

router.get("/balance", authMiddleware, async (req, res) => {
	const acc = await userAccount.findOne({
		userId: req.userId,
	});
	return res.status(200).json({
		balance: acc.balance,
	});
});

router.post("/transfer", authMiddleware, async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	const {amount, toAcc} = req.body;

	const account = await userAccount
		.findOne({
			userId: req.userId,
		})
		.session(session);

	if (!account) {
		await session.abortTransaction();
		return res.status(400).json({
			message: "invalid user",
		});
	}
	if (account.balance < amount) {
		await session.abortTransaction();
		return res.status(400).json({
			message: "insufficient balance",
		});
	}

	const toAccount = await userAccount
		.findOne({
			userId: toAcc,
		})
		.session(session);

	if (!toAccount) {
		await session.abortTransaction();
		return res.status(400).json({
			message: "cant find receiver",
		});
	}

	await userAccount
		.updateOne(
			{
				userId: req.userId,
			},
			{
				$inc: {balance: -amount},
			}
		)
		.session(session);

	await userAccount
		.updateOne(
			{
				userId: toAcc,
			},
			{
				$inc: {balance: amount},
			}
		)
		.session(session);

	await session.commitTransaction();
});

module.exports = {
	router,
};
