'use client'

import { useState } from 'react'

/**
 * Bir qatorda bir nechta mustaqil <form> (masalan "Sinov darsiga
 * yozish" / "Kelmadi" / "Rad etdi") bo'lsa — har birining o'z
 * `<Yuborish>` tugmasi FAQAT o'ZINING formasi yuborilganini biladi
 * (useFormStatus shunday ishlaydi). Ya'ni odam bittasini bossa,
 * qolganlari hali ham bosiladigan holda qoladi — tez ketma-ket
 * bosilsa, bir xil yozuvga ikkita qarama-qarshi amal (masalan
 * "Kelmadi" HAM, "Qaytadan kutish" HAM) ketishi mumkin edi.
 *
 * Bu componentdagi bitta submit — GURUHDAGI hammasini darhol
 * o'chiradi (native <fieldset disabled>, forma qaysi ID'ga tegishli
 * bo'lishidan qat'iy nazar DOM ichidagi hammasini qamraydi).
 * JavaScriptsiz ham forma o'zi ishlayveradi — bu faqat qo'shimcha
 * himoya qatlami.
 */
export function AmalGuruhi({ children }: { children: React.ReactNode }) {
  const [band, setBand] = useState(false)

  return (
    <fieldset
      disabled={band}
      className="contents m-0 border-0 p-0"
      onSubmitCapture={() => {
        if (!band) setBand(true)
      }}
    >
      {children}
    </fieldset>
  )
}
