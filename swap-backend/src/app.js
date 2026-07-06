const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");

const swapRoutes = require("./routes/swapRoutes");
const errorHandler = require("./middleware/errorHandler");
const rateLimiter = require("./middleware/rateLimiter");

const app = express();

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: [
          "'self'",
          "data:",
          "https://rabbit-cryptocurrency-icons.fra1.cdn.digitaloceanspaces.com",
          "https://cdn.jsdelivr.net",
          "https://api-assets.rubic.exchange",
          "https://api.changehero.io",
          "https://changehero.io",
          "https://static.changehero.io",
        ],
      },
    },
  })
);
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimiter);
app.use("/api", swapRoutes);

// console.log(__dirname);
// app.use(express.static(path.join(__dirname, "../../swap-frontend/dist")));

// app.get("/*splat", (req,res) => {
//   res.sendFile(path.join(__dirname, "../../swap-frontend/dist", "index.html"));
// });

app.use(errorHandler);  

module.exports = app;
