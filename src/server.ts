import app from "./app";
import { envVars } from "./app/config";
import { prisma } from "./app/lib/prisma";
import { seedSuperAdmin, seedTesterAdmin } from "./app/utils/seed";

const PORT = envVars.PORT;

const main = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");
		await seedSuperAdmin();
		await seedTesterAdmin();
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
