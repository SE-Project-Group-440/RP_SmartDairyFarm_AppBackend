import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../Models/UserModel.js";

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_REDIRECT_URI,
        },
        async (accessToken, refreshToken, profile, done) =>
        {
            try
            {
                // Check if user already exists
                let user = await User.findOne({ email: profile.emails[0].value });

                if (!user)
                {
                    // If not, create new user
                    user = await User.create({
                        fname: profile.name.givenName,
                        lname: profile.name.familyName,
                        email: profile.emails[0].value,
                        password: "google_oauth_dummy", // not used
                        mobile: "N/A",
                        residenceId: "N/A",
                        admintype: false,
                    });
                }

                return done(null, user);
            } catch (err)
            {
                return done(err, null);
            }
        }
    )
);

// Serialize / Deserialize
passport.serializeUser((user, done) =>
{
    done(null, user.id);
});
passport.deserializeUser(async (id, done) =>
{
    const user = await User.findById(id);
    done(null, user);
});

export default passport;
