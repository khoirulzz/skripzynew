function calculateCRC16(data) {
    const polynomial = 0x1021;
    let crc = 0xFFFF; // Initial value

    for (let i = 0; i < data.length; i++) {
        crc ^= (data.charCodeAt(i) << 8);

        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ polynomial) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

const basePayload = "00020101021126610014COM.GO-JEK.WWW01189360091438876418720210G8876418720303UMI51440014ID.CO.QRIS.WWW0215ID10243599556960303UMI5204829953033605802ID5925Skripzy, Digital & Educat6010PEKALONGAN61055116462070703A0163041982";
const dataToCalc = basePayload.slice(0, -4); // Slice off "1982"
const calculated = calculateCRC16(dataToCalc);
console.log("Original CRC: 1982");
console.log("Calculated CRC:", calculated);
