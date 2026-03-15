import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
    name: 'user', // it is a default argument, we have to give it 
    initialState: {
        userData: null
    },
    reducers: {
        setUserData: (state, action) => {
            state.userData = action.payload // state.userData means current userData, action.payload means the data we are getting
        }
    }
})

export const { setUserData } = userSlice.actions;
export default userSlice.reducer;