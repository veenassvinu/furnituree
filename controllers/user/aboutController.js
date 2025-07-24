

const aboutUsPage = async (req, res) => {
  try {
    res.render("about us"); // Make sure views/about-us.ejs exists
  } catch (error) {
    console.error("Error rendering About Us page:", error.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  aboutUsPage,
};
