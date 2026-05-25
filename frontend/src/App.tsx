import { Routes, Route } from "react-router-dom";
import Layout from "./components/common/Layout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import BookDetail from "./pages/BookDetail";
import Read from "./pages/Read";
import Sources from "./pages/Sources";
import Shelf from "./pages/Shelf";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shelf" element={<Shelf />} />
        <Route path="/search" element={<Search />} />
        <Route path="/book" element={<BookDetail />} />
        <Route path="/sources" element={<Sources />} />
      </Route>
      <Route path="/read" element={<Read />} />
    </Routes>
  );
}
