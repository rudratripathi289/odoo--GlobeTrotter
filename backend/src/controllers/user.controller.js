import * as userService from '../services/user.service.js';

const PROFILE_FIELD_LIMITS = Object.freeze({
  displayName: 50,
  bio: 300,
  location: 100,
});

export const getMe = async (req, res, next) => {
  try {
    const user = await userService.getMe(req.user?.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateMe(req.user?.id, req.body);
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    await userService.updatePassword(req.user?.id, req.body);
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteMe = async (req, res, next) => {
  try {
    await userService.deleteMe(req.user?.id, req.body.password);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getSavedDestinations = async (req, res, next) => {
  try {
    const destinations = await userService.getSavedDestinations(req.user?.id, req.query);
    res.status(200).json(destinations);
  } catch (error) {
    next(error);
  }
};

export const addSavedDestination = async (req, res, next) => {
  try {
    const saved = await userService.addSavedDestination(req.user?.id, req.body.cityId);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

export const deleteSavedDestination = async (req, res, next) => {
  try {
    await userService.deleteSavedDestination(req.user?.id, req.params.cityId);
    res.status(200).json({ message: 'Saved destination removed' });
  } catch (error) {
    next(error);
  }
};
