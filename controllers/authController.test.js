import { updateProfileController } from "./authController.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js", () => ({
  hashPassword: jest.fn(),
}));

describe("authController", () => {
  describe("updateProfileController", () => {

    let existingUser, res;
    beforeEach(() => {
      jest.clearAllMocks() // Clear mocks before each test

      existingUser = {
        _id: "userId123",
        name: "Old Name",
        password: "hashedOldPassword",
        email: "oldemail@example.com",
        phone: "0987654321",
        address: "Old Address",
      };
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
    });

    test("should update user profile successfully", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: {
          name: "New Name",
          password: "newpassword",
          address: "New Address",
          phone: "1234567890",
        },
      };

      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockResolvedValue("hashedNewPassword");

      const updatedUser = {
        ...existingUser,
        name: "New Name",
        password: "hashedNewPassword",
        phone: "1234567890",
        address: "New Address",
      };

      userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

      // Act
      await updateProfileController(req, res);

      // Assert — DB logic
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).toHaveBeenCalledWith("newpassword");

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId123",
        {
          name: "New Name",
          password: "hashedNewPassword",
          phone: "1234567890",
          address: "New Address",
        },
        { new: true }
      );

      // Assert — response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Profile updated successfully",
          updatedUser: 
          { 
            ...existingUser,
            name: "New Name",
            password: "hashedNewPassword",
            phone: "1234567890",
            address: "New Address",
          },
        })
      );
    });



    test("should update user profile successfully with changing only name", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: {
          name: "New Name",
        },
      };

      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...existingUser,
        name: "New Name",
      });

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId123",
        {
          name: "New Name",
          password: "hashedOldPassword",
          phone: "0987654321",
          address: "Old Address",
        },
        { new: true }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: {
          ...existingUser,
          name: "New Name",
          password: "hashedOldPassword",
          phone: "0987654321",
          address: "Old Address",
        },
      });
    });


    test("should update user profile successfully with changing only password", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: {
          password: "newpassword",
        },
      };

      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockResolvedValue("hashedNewPassword");
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...existingUser,
        password: "hashedNewPassword",
      });

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).toHaveBeenCalledWith("newpassword");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId123",
        {
          name: "Old Name",
          password: "hashedNewPassword",
          phone: "0987654321",
          address: "Old Address",
        },
        { new: true }   
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: {
          ...existingUser,
          password: "hashedNewPassword",
        },
      });
    });

    test("should return error if password is less than 6 characters", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: {
          password: "123",
        },
      };
      userModel.findById.mockResolvedValue(existingUser);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Password is required and 6 character long",
      });
    });

    test("should handle errors during profile update", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: {
          name: "New Name",
        },
      };
      userModel.findById.mockRejectedValue(new Error("Database error"));

      // Act
      await updateProfileController(req, res);
      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating profile",
          error: expect.any(Error),
        })
      );
    });


    test("should handle errors during password hashing", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123",},
        body: { password: "newpassword", },
      };
      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockRejectedValue(new Error("Hashing error"));

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).toHaveBeenCalledWith("newpassword");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating profile",
          error: expect.any(Error),
        })
      );
    });


    test("should handle errors during user update", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: { name: "New Name" },
      };
      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockRejectedValue(new Error("Update error"));

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId123",
        {
          name: "New Name",
          password: "hashedOldPassword",
          phone: "0987654321",
          address: "Old Address",
        },
        { new: true }
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating profile",
          error: expect.any(Error),
        })
      );
    });


  });





});
  

