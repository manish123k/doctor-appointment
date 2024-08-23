const mongooes=require("mongoose");
mongooes.connect(process.env.MONGO_URL);
const connection=mongooes.connection;
connection.on("connected",() =>
{
 console.log("Mongo DB connected is successful");
});
connection.on("error",(error) =>
{
 console.log("Mongo DB not connected",error);
});

module.exports=mongooes;