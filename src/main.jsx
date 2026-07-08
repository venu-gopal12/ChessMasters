import React, { Suspense, lazy } from "react";
import axios from 'axios'; // Import axios
import { createRoot } from "react-dom/client";
import "./main.css";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import Greeting from "./components/Greetings.jsx";
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
const HomePage = lazy(() => import("./components/index.jsx"));
const CoachDashboard = lazy(() => import("./components/CoachDashboard.jsx"));
const Coachprofile = lazy(() => import("./components/Coachprofile.jsx"));
const Coachdash = lazy(() => import("./components/Coachdash.jsx"));
const Profile = lazy(() => import("./components/Profile.jsx"));
const CProfile = lazy(() => import("./components/CProfile.jsx"));
const Dashboard = lazy(() => import("./components/admin_dashboard.jsx"));
const FileUpload = lazy(() => import("./components/fileupload.jsx"));
const CoachesAvaialble = lazy(() => import("./components/coachesavailable.jsx"));
const AddCoachForm = lazy(() => import("./components/AddDetails.jsx"));
const ArticleDetail = lazy(() => import("./components/ArticleDetails.jsx"));
const ArticlePdfViewer = lazy(() => import("./components/ArticlePdfViewer.jsx"));
const ChessBoard = lazy(() => import("./components/Chessboard.jsx"));
const PricingPlans = lazy(() => import("./components/PricingPlans.jsx"));
const PaymentPage = lazy(() => import("./components/PaymentPage.jsx"));
const VideoDetail = lazy(() => import("./components/VideoDetails.jsx"));
const ArticleUpdate = lazy(() => import("./components/ArticleUpdate.jsx"));
const VideoUpdate = lazy(() => import("./components/VideoUpdate.jsx"));
const UpdateProfile = lazy(() => import("./components/UpdateProfile.jsx"));
const ViewGame = lazy(() => import("./components/ViewGame.jsx"));
const Rules = lazy(() => import("./components/rules.jsx"));

// Set up axios defaults
axios.defaults.withCredentials = true;
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) window.location.assign("/");
        return Promise.reject(error);
    }
);

// Intercept requests to add Authorization header
// axios.interceptors.request.use(
//     (config) => {
//         const token = document.cookie
//             .split('; ')
//             .find(row => row.startsWith('authorization='))
//             ?.split('=')[1];

//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     },
//     (error) => {
//         console.error('Request error:', error); // Log request error for debugging
//         return Promise.reject(error);
//     }
// );

// Intercept responses for error handling
// axios.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         if (error.response) {
//             if (error.response.status === 401 || error.response.status === 403) {
//                 localStorage.removeItem('userId');
//                 window.location.href = '/login';
//             } else {
//                 alert(`Error: ${error.response.status} - ${error.response.statusText}`);
//             }
//         } else if (error.request) {
//             alert('Network error, please check your connection.');
//         } else {
//             alert(`Error: ${error.message}`);
//         }
//         return Promise.reject(error);
//     }
// );

const withLoading = (component) => <Suspense fallback={<div>Loading…</div>}>{component}</Suspense>;
const router = createBrowserRouter([
        { path: '/', element: <Greeting onLoginSuccess={() => {}} /> },
        { path: '/login', element: <Navigate to="/" replace /> },
        { path: '/AdminDashboard', element: withLoading(<Dashboard />) },
        { path: '/coach/:coachId/CoachDashboard', element: withLoading(<CoachDashboard />) },
        { path: '/PlayerDashboard', element: withLoading(<Profile />) },
        { path: '/CoachProfiles', element: withLoading(<Coachprofile />) },
        { path: '/CoachInfo/:id', element: withLoading(<Coachdash />) },
        { path: '/player/:id/profile', element: withLoading(<Profile />) },
        { path: '/coach/:coachId/CoachProfile', element: withLoading(<CProfile />) },
        { path: '/Index', element: withLoading(<HomePage />) },
        { path: '/CoachesAvailable', element: withLoading(<CoachesAvaialble />) },
        { path: '/AddData', element: withLoading(<AddCoachForm />) },
        { path: '/coaches', element: withLoading(<CoachesAvaialble />) },
        { path: '/Coachdash/:id', element: withLoading(<Coachdash />) },
        { path: '/Upload', element: withLoading(<FileUpload />) },
        { path: '/ArticleDetail/:id', element: withLoading(<ArticleDetail />) },
        { path: '/article-view/:id', element: withLoading(<ArticlePdfViewer />) },
        { path: '/VideoDetail/:id', element: withLoading(<VideoDetail />) },
        { path: '/ChessBoard', element: withLoading(<ChessBoard />) },
        { path: '/pricingplans', element: withLoading(<PricingPlans />) },
        { path: '/payment', element: withLoading(<PaymentPage />) },
        { path: '/article-update/:id', element: withLoading(<ArticleUpdate />) },
        { path: '/video-update/:id', element: withLoading(<VideoUpdate />) },
        { path: '/update-profile', element: withLoading(<UpdateProfile />) },
        { path: '/ViewGame/:gameId', element: withLoading(<ViewGame />) },
        { path: '/rules', element: withLoading(<Rules />) },
        // { path: '*', element: <Navigate to="/404" /> }, // Handle undefined routes
    ]);

function App() {
    return (
        <Provider store={store}>
            <RouterProvider router={router} />
        </Provider>
    );
}

// Error boundary to catch errors in any component tree
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary Caught an Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <div>Something went wrong. Please try again later.</div>;
        }
        return this.props.children;
    }
}

// Wrapping App component with ErrorBoundary for catching errors
createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
