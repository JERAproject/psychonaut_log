import bcrypt from "bcryptjs";
const storedHash = "$2a$10$oawVjysXzFjwpn7XYFCxZu0ikOAsO7/yyaAIEdkJXuDRgpS5qc7A6";
const match = bcrypt.compareSync("psy2024", storedHash);
console.log("Match with stored hash:", match);

const newHash = bcrypt.hashSync("psy2024", 10);
console.log("New hash:", newHash);
const match2 = bcrypt.compareSync("psy2024", newHash);
console.log("Match with new hash:", match2);