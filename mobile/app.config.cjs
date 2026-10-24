const base = require("./app.json").expo;
const production = process.env.APP_VARIANT === "production";
module.exports = {
  expo: {
    ...base,
    scheme: production ? "puppyclicker" : "puppyclicker-reactpreview",
    name: production ? "Puppy Clicker" : "Puppy Clicker React Preview",
    android: {
      ...base.android,
      package: production
        ? "com.harleytg.puppyclicker"
        : "com.harleytg.puppyclicker.reactpreview",
    },
  },
};
