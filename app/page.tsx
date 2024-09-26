import Image from "next/image";
import { Appbar } from "./components/Appbar";
import CreateRoomForm from "./components/CreateRoom";

export default function Home() {
  return (
    <div className="overflow-hidden ">
      <Appbar></Appbar>
      <CreateRoomForm/>
    </div>
  );
}
