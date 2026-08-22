import * as adminService from '../services/admin.service.js';

// --- USERS ---
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await adminService.getAllUsers(req.query);
    res.status(200).json(users);
  } catch (error) { next(error); }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.userId);
    res.status(200).json(user);
  } catch (error) { next(error); }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const updated = await adminService.updateUserRole(req.params.userId, req.body.role, req.user?.id);
    res.status(200).json(updated);
  } catch (error) { next(error); }
};

export const deleteUser = async (req, res, next) => {
  try {
    await adminService.deleteUser(req.params.userId, req.user?.id);
    res.status(200).json({ message: 'User deleted' });
  } catch (error) { next(error); }
};

// --- ANALYTICS ---
export const getAnalyticsOverview = async (req, res, next) => {
  try {
    const overview = await adminService.getAnalyticsOverview();
    res.status(200).json(overview);
  } catch (error) { next(error); }
};

export const getPopularCities = async (req, res, next) => {
  try {
    const cities = await adminService.getPopularCities();
    res.status(200).json(cities);
  } catch (error) { next(error); }
};

export const getPopularActivities = async (req, res, next) => {
  try {
    const activities = await adminService.getPopularActivities();
    res.status(200).json(activities);
  } catch (error) { next(error); }
};

export const getCopiedTrips = async (req, res, next) => {
  try {
    const copied = await adminService.getCopiedTrips();
    res.status(200).json(copied);
  } catch (error) { next(error); }
};

// --- MASTER DATA MANAGEMENT ---
export const createCountry = async (req, res, next) => {
  try {
    const country = await adminService.createCountry(req.body);
    res.status(201).json(country);
  } catch (error) { next(error); }
};

export const updateCountry = async (req, res, next) => {
  try {
    const updated = await adminService.updateCountry(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (error) { next(error); }
};

export const deleteCountry = async (req, res, next) => {
  try {
    await adminService.deleteCountry(req.params.id);
    res.status(200).json({ message: 'Country deleted' });
  } catch (error) { next(error); }
};

export const createState = async (req, res, next) => {
  try {
    const state = await adminService.createState(req.body);
    res.status(201).json(state);
  } catch (error) { next(error); }
};

export const updateState = async (req, res, next) => {
  try {
    const updated = await adminService.updateState(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (error) { next(error); }
};

export const deleteState = async (req, res, next) => {
  try {
    await adminService.deleteState(req.params.id);
    res.status(200).json({ message: 'State deleted' });
  } catch (error) { next(error); }
};

export const createCity = async (req, res, next) => {
  try {
    const city = await adminService.createCity(req.body);
    res.status(201).json(city);
  } catch (error) { next(error); }
};

export const updateCity = async (req, res, next) => {
  try {
    const updated = await adminService.updateCity(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (error) { next(error); }
};

export const deleteCity = async (req, res, next) => {
  try {
    await adminService.deleteCity(req.params.id);
    res.status(200).json({ message: 'City deleted' });
  } catch (error) { next(error); }
};

export const createActivity = async (req, res, next) => {
  try {
    const activity = await adminService.createActivity(req.body);
    res.status(201).json(activity);
  } catch (error) { next(error); }
};

export const updateActivity = async (req, res, next) => {
  try {
    const updated = await adminService.updateActivity(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (error) { next(error); }
};

export const deleteActivity = async (req, res, next) => {
  try {
    await adminService.deleteActivity(req.params.id);
    res.status(200).json({ message: 'Master activity deleted' });
  } catch (error) { next(error); }
};
