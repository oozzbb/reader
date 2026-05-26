import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/common/Layout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import BookDetail from "./pages/BookDetail";
import Read from "./pages/Read";
import Sources from "./pages/Sources";
import Shelf from "./pages/Shelf";

function useVersionCheck() {
  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((data) => {
        const stored = localStorage.getItem("app_version");
        if (stored && stored !== data.version) {
          localStorage.setItem("app_version", data.version);
          window.location.reload();
        } else {
          localStorage.setItem("app_version", data.version);
        }
      })
      .catch(() => {});
  }, []);
}

export default function App() {
  useVersionCheck();
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
