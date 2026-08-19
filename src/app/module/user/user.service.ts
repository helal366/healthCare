import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { UploadApiResponse } from "cloudinary";

const uploadProfileImage = async (buffer: Buffer, userId:string) => {

    const user = await prisma.user.findUnique({
        where:{
            id: userId
        },
        select:{
            profilePhotoPublicId: true
        }
    })

    const uploadPhotoResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ resource_type: "auto" }, (error, result) => {
            if (error) {
              console.log(error);
              return reject(error);
            };
            if(!result){
                return reject(new Error("No result returned from cloudinary."))
            }
            return resolve(result);
          })
          .end(buffer);
      },
    );

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        profilePhoto: uploadPhotoResult?.secure_url,
        profilePhotoPublicId: uploadPhotoResult?.public_id,
      },
      omit: {
        password: true
      }
    });
    if(user?.profilePhotoPublicId){
       await cloudinary.uploader.destroy(user.profilePhotoPublicId)
    }
    return updatedUser;

};

export const userServices = {
  uploadProfileImage,
};

