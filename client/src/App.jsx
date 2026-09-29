import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ContentProvider } from "./context/ContentContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import Layout from "./components/Layout.jsx";
import { legacyToRoute } from "./lib/util.js";
import Home from "./pages/Home.jsx";
import Courses from "./pages/Courses.jsx";
import CourseDetail from "./pages/CourseDetail.jsx";
import Tools from "./pages/Tools.jsx";
import Product from "./pages/Product.jsx";
import Services from "./pages/Services.jsx";
import ServiceDetail from "./pages/ServiceDetail.jsx";
import Teachers from "./pages/Teachers.jsx";
import TeacherDetail from "./pages/TeacherDetail.jsx";
import Contact from "./pages/Contact.jsx";
import Cart from "./pages/Cart.jsx";
import Track from "./pages/Track.jsx";
import NotFound from "./pages/NotFound.jsx";

/* Old static-site URLs (course.html?id=x …) redirect to the new routes */
function FallbackRoute() {
  const { pathname, search, hash } = useLocation();
  const to = legacyToRoute(pathname, search, hash);
  return to ? <Navigate to={to} replace /> : <NotFound />;
}

export default function App() {
  return (
    <ToastProvider>
      <ContentProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="courses" element={<Courses />} />
              <Route path="course/:id" element={<CourseDetail />} />
              <Route path="tools" element={<Tools />} />
              <Route path="product/:id" element={<Product />} />
              <Route path="services" element={<Services />} />
              <Route path="service/:id" element={<ServiceDetail />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="teacher/:id" element={<TeacherDetail />} />
              <Route path="contact" element={<Contact />} />
              <Route path="cart" element={<Cart />} />
              <Route path="track" element={<Track />} />
              <Route path="*" element={<FallbackRoute />} />
            </Route>
          </Routes>
        </CartProvider>
      </ContentProvider>
    </ToastProvider>
  );
}
