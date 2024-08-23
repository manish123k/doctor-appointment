import {configureStore} from '@reduxjs/toolkit';
import {combineReducers} from 'redux';
import { alertsSlice } from './alertsSlice';
import {userSlice} from './userSlice';
const rootReducers=combineReducers({
alerts:alertsSlice.reducer,
user:userSlice.reducer,
});
const store=configureStore({
reducer:rootReducers,
});
export default store;