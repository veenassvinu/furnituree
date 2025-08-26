

const aboutUsPage = async (req, res) => {
  try {
    res.render("about us"); 
  } catch (error) {
    console.error("Error rendering About Us page:", error.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  aboutUsPage,
};
