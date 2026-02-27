if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
  process.env.DATABASE_URL = "mysql://root:password@127.0.0.1:3306/telecommut";
}
