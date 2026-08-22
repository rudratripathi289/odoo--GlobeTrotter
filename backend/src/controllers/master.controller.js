import * as masterService from '../services/master.service.js';

const DEFAULT_PAGE_SIZE = 20;

export const getCountries = async (req, res, next) => {
  try {
    const countries = await masterService.getCountries(req.query);
    res.status(200).json(countries);
  } catch (error) {
    next(error);
  }
};

export const getStates = async (req, res, next) => {
  try {
    const states = await masterService.getStates(req.query);
    res.status(200).json(states);
  } catch (error) {
    next(error);
  }
};

export const getCities = async (req, res, next) => {
  try {
    const cities = await masterService.getCities(req.query);
    res.status(200).json(cities);
  } catch (error) {
    next(error);
  }
};

export const getCityById = async (req, res, next) => {
  try {
    const city = await masterService.getCityById(req.params.cityId);
    res.status(200).json(city);
  } catch (error) {
    next(error);
  }
};

export const getCityActivities = async (req, res, next) => {
  try {
    const activities = await masterService.getCityActivities(req.params.cityId, req.query);
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};
