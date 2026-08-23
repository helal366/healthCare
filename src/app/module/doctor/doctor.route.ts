import { Router } from "express";
import { doctorController } from "./doctor.controller";
import { upload } from "../../lib/multer";

const router=Router();
router.post("/apply_as_doctor", 
    upload.fields([
        {name:"resume", maxCount:1},
        {name: "additionalFiles", maxCount:10}
    ]),
    doctorController.applyAsDoctor);

export const DoctorRouter=router