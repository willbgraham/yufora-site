import Image from "next/image";

export default function Home() {
  return (
    <main>
      <Image
        src="/yufora1200.png"
        alt="Yufora"
        width={520}
        height={520}
        priority
        style={{ width: "min(80vw, 520px)", height: "auto" }}
      />
    </main>
  );
}
