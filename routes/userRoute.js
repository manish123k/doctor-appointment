const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddelware=require("../middelwares/authMiddelware");
const Appointment = require("../models/appointmentModel");
const moment = require("moment");
router.post("/Register", async (req, res) => {
  try {
    const userExist = await User.findOne({ email: req.body.email });
    if (userExist) {
      return res.status(200).send({ message: "user already exists", success: false });
    }
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    req.body.password = hashPassword;
    const newUser = new User(req.body);
    await newUser.save();
    res.status(200).send({ message: "user created successfully", success: true });
  } catch (error) {
    console.log(error)
    res.status(500).send({ message: "error creating user", success: true });
  }
});
router.post("/Login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(200).send({ message: "user does not exists", success: false });
    }
    const ismatch = await bcrypt.compare(req.body.password, user.password);
    if (!ismatch) {
      return res.status(200).send({ message: "password is incorrect", success: false });
    } else {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
      res.status(200).send({ message: "Login successful", success: true, data: token });
    }
  } catch (error) {
    console.log(error)
    res.status(200).send({ message: "error logging in", success: false, error });
  }
});
router.post("/get-user-info-by-id", authMiddelware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userId });
    user.password=undefined;
    if (!user) {
      return res.status(200).send({ message: "user does not exists", success: false });
    }
    else {
      res.status(200).send({
        success: true,
        data: user,
      });
    }
  } catch (error) {
    res.status(500).send({ message: "error getting user info", success: false, error });
  }
});

router.post("/apply-doctor-account",authMiddelware, async (req, res) => {
  try {
    const newdoctor = new Doctor({ ...req.body, status:"pending"});
    await newdoctor.save();
    const adminUser = await User.findOne({ isAdmin: true });

   const unseenNotification=adminUser.unseenNotification;
   unseenNotification.push({
      type:"new-doctor-request",
      message: `${newdoctor.firstName} ${newdoctor.lastName} has applied for a doctor account`,
      data: {
        doctorId: newdoctor._id,
        name: newdoctor.firstName + " " + newdoctor.lastName,
      },
      onClickPath: "/admin/doctorslist",
    });
    await User.findByIdAndUpdate(adminUser._id, {unseenNotification});
    res.status(200).send({success: true, message: "Doctor account applied successfully"});
  } catch (error) {
    console.log(error);
    res.status(500).send({message:"Error applying doctor account",success: false, error });
  }
});

router.post(
  "/mark-all-notifications-as-seen",
  authMiddelware,
  async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.body.userId });
      const unseenNotification = user.unseenNotification;
      const seenNotification = user.seenNotification;
      seenNotification.push(...unseenNotification);
      user.unseenNotification = [];
      user.seenNotification = seenNotification;
      const updatedUser = await user.save();
      updatedUser.password = undefined;
      res.status(200).send({
        success: true,
        message: "All notifications marked as seen",
        data: updatedUser,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Error applying doctor account",
        success: false,
        error,
      });
    }
  }
);

router.post("/delete-all-notifications", authMiddelware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userId });
    user.seenNotification = [];
    user.unseenNotification = [];
    const updatedUser = await user.save();
    updatedUser.password = undefined;
    res.status(200).send({
      success: true,
      message: "All notifications cleared",
      data: updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error applying doctor account",
      success: false,
      error,
    });
  }
});
router.get("/get-all-approved-doctors", authMiddelware, async (req, res) => {
  try {
    const doctors = await Doctor.find({status:"approved"});
    res.status(200).send({
      message: "Doctors fetched successfully",
      success: true,
      data: doctors,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error applying doctor account",
      success: false,
      error,
    });
  }
});
router.post("/book-appointment", authMiddelware, async (req, res) => {
  try {
    req.body.status = "pending";
    req.body.date = moment(req.body.date, "DD-MM-YYYY").toISOString();
    req.body.time = moment(req.body.time, "HH:mm").toISOString();
    const newAppointment = new Appointment(req.body);
    await newAppointment.save();
    //pushing notification to doctor based on his userid
    const user = await User.findOne({ _id: req.body.doctorInfo.userId });
    user.unseenNotification.push({
      type: "new-appointment-request",
      message: `A new appointment request has been made by ${req.body.userInfo.name}`,
      onClickPath: "/doctor/appointments",
    });
    await user.save();
    res.status(200).send({
      message: "Appointment booked successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error booking appointment",
      success: false,
      error,
    });
  }
});
router.post("/check-booking-avilability", authMiddelware, async (req, res) => {
  try {
    const date = moment(req.body.date, "DD-MM-YYYY").toISOString();
    const fromTime = moment(req.body.time, "HH:mm").subtract(1, "hours").toISOString();
    const toTime = moment(req.body.time, "HH:mm").add(1, "hours").toISOString();
    const doctorId = req.body.doctorId;
    const appointments = await Appointment.find({
      doctorId,
      date,
      time: { $gte: fromTime, $lte: toTime },
    });
    if (appointments.length > 0) {
      return res.status(200).send({
        message: "Appointments not available",
        success: false,
      });
    } else {
      return res.status(200).send({
        message: "Appointments available",
        success: true,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error booking appointment",
      success: false,
      error,
    });
  }
});
router.get("/get-appointments-by-user-id", authMiddelware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.body.userId });
    res.status(200).send({
      message: "Appointments fetched successfully",
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error fetching appointments",
      success: false,
      error,
    });
  }
});

module.exports = router;
