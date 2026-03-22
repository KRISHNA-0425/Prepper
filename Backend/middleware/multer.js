import multer from "multer";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public");
    },
    filename: (req, file, cb) => {
        const fileName = Date.now() + "-" + file.originalname;
        cb(null, fileName);
    }
})

export const upload = multer({
    storage: storage,
    limits:{fileSize: 10*1024*1024}, // 10mb limit
})


