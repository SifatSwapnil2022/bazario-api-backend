const mongoose = require('mongoose');

module.exports.dbConnect = async () => {
  try {
    console.log('MODE:', process.env.mode);
    console.log('DB_PRO_URL:', process.env.DB_PRO_URL);
    console.log('DB_LOCAL_URL:', process.env.DB_LOCAL_URL);

    if (process.env.mode === 'pro') {
      if (!process.env.DB_PRO_URL) {
        throw new Error('DB_PRO_URL is not defined in environment variables');
      }
      await mongoose.connect(process.env.DB_PRO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("Production database connected");
    } else {
      if (!process.env.DB_LOCAL_URL) {
        throw new Error('DB_LOCAL_URL is not defined in environment variables');
      }
      await mongoose.connect(process.env.DB_LOCAL_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("Local database connected");
    }
  } catch (error) {
    console.error('DB connection error:', error.message);
    process.exit(1); // Exit the app if DB connection fails
  }
};
