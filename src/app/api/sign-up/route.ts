import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";

export async function POST(request: Request) {
    await dbConnect()

    try {
        const { username, email, password } = await request.json();

        const exiting_user_verified_by_usernamae = await UserModel.findOne({
            username,
            isVerified: true
        })

        if (exiting_user_verified_by_usernamae) {
            return Response.json({
                success: false,
                message: "Username is already taken",
            }, { status: 400 })
        }

        const exiting_user_by_email = await UserModel.findOne({ email })
        const verify_Code = Math.floor(100000 + Math.random() * 900000).toString();
        if (exiting_user_by_email) {
            if (exiting_user_by_email.isVerified) {
                return Response.json({
                    success: false,
                    message: "User already exist with this email"
                }, { status: 400 })
            } else {
                const hashed_password = await bcrypt.hash(password, 10)
                exiting_user_by_email.password = hashed_password
                exiting_user_by_email.verifyCode = verify_Code
                exiting_user_by_email.verifyCodeExpiry = new Date(Date.now() + 3600000);
                await exiting_user_by_email.save();
            }
        } else {
            const hashed_password = await bcrypt.hash(password, 10)
            const expiry_date = new Date();
            expiry_date.setHours(expiry_date.getHours() + 1);

            const new_user = new UserModel({
                username,
                email,
                password: hashed_password,
                verifyCode: verify_Code,
                verifyCodeExpiry: expiry_date,
                isVerified: false,
                isAcceptingMessage: true,
                messages: []
            });

            await new_user.save();
        }

        // send verification email
        const email_response = await sendVerificationEmail(
            email,
            username,
            verify_Code
        )

        if (!email_response.success) {
            return Response.json({
                success: false,
                message: email_response.message
            }, { status: 500 })
        }


        return Response.json({
            success: true,
            message: "User Register successfully, Please verify your email"
        }, { status: 201 })
    } catch (error) {
        console.error("Error registering user", error)
        return Response.json({
            success: false,
            message: "Error registering user"
        },
            {
                status: 500
            }
        )
    }
}