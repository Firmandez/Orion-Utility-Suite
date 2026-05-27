const MAC_VENDORS: &[(&str, &str)] = &[
    ("00:00:0C", "Cisco"),
    ("00:03:93", "Apple"),
    ("00:05:cd", "Denon"),
    ("00:06:86", "FiberHome"),
    ("00:06:25", "Linksys"),
    ("00:09:5B", "Netgear"),
    ("00:0F:3D", "D-Link"),
    ("00:11:24", "Apple"),
    ("00:14:22", "Dell"),
    ("00:15:EB", "ZTE"),
    ("00:16:3E", "Xen / Virtual Machine"),
    ("00:18:39", "Linksys"),
    ("00:19:C6", "ZTE"),
    ("00:19:E3", "TP-Link"),
    ("00:1A:11", "Google"),
    ("00:1B:FC", "ASUS"),
    ("00:1C:42", "Parallels / Virtual Machine"),
    ("00:1D:C9", "Garmin"),
    ("00:1E:10", "Huawei"),
    ("00:21:27", "TP-Link"),
    ("00:21:70", "Dell"),
    ("00:22:93", "ZTE"),
    ("00:22:A1", "Huawei"),
    ("00:23:CD", "TP-Link"),
    ("00:24:8C", "ASUS"),
    ("00:25:90", "Supermicro"),
    ("00:26:BB", "Apple"),
    ("00:50:56", "VMware / Virtual Machine"),
    ("00:B0:0C", "Tenda"),
    ("00:E0:FC", "Oppo"),
    ("00:e0:4c", "Realtek"),
    ("00:F0:8A", "Vivo"),
    ("04:18:B6", "Ubiquiti"),
    ("04:D4:C4", "Samsung"),
    ("08:00:27", "VirtualBox / Virtual Machine"),
    ("0C:80:63", "TP-Link"),
    ("0C:9D:92", "Xiaomi"),
    ("0C:A6:94", "Realme"),
    ("10:D0:7A", "Intel"),
    ("10:D5:61", "Tuya Smart"),
    ("14:3E:BF", "Oppo"),
    ("14:CF:92", "TP-Link"),
    ("18:E8:29", "Ubiquiti"),
    ("1C:3B:F3", "Intel"),
    ("1C:73:E2", "Huawei"),
    ("1C:87:2C", "ASUS"),
    ("1C:8E:5C", "ZTE"),
    ("20:28:BC", "Hikvision"),
    ("24:0A:C4", "Espressif"),
    ("24:A0:74", "Apple"),
    ("24:DF:6A", "Huawei"),
    ("28:D2:44", "Intel"),
    ("2C:22:8B", "Vivo"),
    ("30:30:F2", "Espressif"),
    ("30:5A:3A", "ASUS"),
    ("30:86:2C", "Huawei"),
    ("30:AE:A4", "Espressif"),
    ("3C:5A:B4", "Google"),
    ("3C:D9:2B", "Hewlett Packard"),
    ("3C:DF:BD", "ZTE"),
    ("3C:E1:A1", "Intel"),
    ("40:40:A7", "Vivo"),
    ("40:8D:5C", "Apple"),
    ("44:19:B6", "Hikvision"),
    ("48:2C:6A", "TP-Link"),
    ("4C:1F:CC", "Huawei"),
    ("4C:5E:0C", "Huawei"),
    ("50:2F:9B", "TP-Link"),
    ("50:78:B3", "Apple"),
    ("50:8A:06", "Tuya Smart"),
    ("50:C7:BF", "TP-Link"),
    ("54:39:DF", "Huawei"),
    ("54:5A:A6", "Espressif"),
    ("54:A5:1B", "Huawei"),
    ("54:B8:0A", "Lenovo"),
    ("5C:C9:D3", "Sony"),
    ("5C:F6:DC", "Realme"),
    ("60:03:08", "Apple"),
    ("60:38:E0", "Samsung"),
    ("64:09:80", "Apple"),
    ("68:57:2D", "Tuya Smart"),
    ("70:89:76", "Tuya Smart"),
    ("70:8B:CD", "ASUS"),
    ("74:DA:38", "TP-Link"),
    ("78:3E:5D", "Vivo"),
    ("7C:60:97", "Huawei"),
    ("7C:78:B2", "Oppo"),
    ("7C:8B:CA", "Intel"),
    ("7C:C5:37", "Xiaomi"),
    ("80:7A:BF", "Raspberry Pi"),
    ("84:1E:19", "Realme"),
    ("84:74:12", "ZTE"),
    ("84:F3:EB", "TP-Link"),
    ("88:66:5A", "Apple"),
    ("88:81:4A", "Vivo"),
    ("8c:85:90", "Apple"),
    ("90:02:A9", "Dahua"),
    ("90:09:D0", "Xiaomi"),
    ("90:48:9A", "Intel"),
    ("9C:20:7B", "Intel"),
    ("9C:C1:21", "ZTE"),
    ("9C:CB:83", "Oppo"),
    ("A0:20:A6", "Espressif"),
    ("A0:9E:1A", "Oppo"),
    ("A0:BD:1D", "Hikvision"),
    ("A0:C5:89", "Intel"),
    ("A0:F3:C1", "TP-Link"),
    ("A4:2B:B0", "Linksys"),
    ("A4:3E:51", "Huawei"),
    ("A8:42:E3", "Espressif"),
    ("A8:57:4E", "TP-Link"),
    ("A8:5E:45", "ASUS"),
    ("B0:C5:54", "Intel"),
    ("B4:12:F1", "Vivo"),
    ("B4:2E:99", "Intel"),
    ("B4:8B:C9", "Intel"),
    ("B8:27:EB", "Raspberry Pi"),
    ("B8:85:84", "Intel"),
    ("BC:32:AC", "Dahua"),
    ("BC:62:0E", "Hikvision"),
    ("BC:EC:5D", "Hikvision"),
    ("C0:3E:BA", "Intel"),
    ("C0:49:EF", "Espressif"),
    ("C0:56:E3", "Apple"),
    ("C0:84:7D", "Oppo"),
    ("C0:A7:27", "Huawei"),
    ("C4:9E:C8", "Intel"),
    ("C8:2B:96", "Espressif"),
    ("C8:3A:35", "Realme"),
    ("C8:D7:19", "Intel"),
    ("CC:50:E3", "Espressif"),
    ("D0:5B:A8", "ZTE"),
    ("D4:3B:04", "Huawei"),
    ("D4:5D:64", "Intel"),
    ("D8:13:99", "Oppo"),
    ("D8:1C:2A", "Tuya Smart"),
    ("D8:3B:BF", "Intel"),
    ("D8:49:0B", "Huawei"),
    ("D8:50:E6", "ASUS"),
    ("D8:EC:5E", "Intel"),
    ("DC:A6:32", "Raspberry Pi"),
    ("E0:41:38", "Oppo"),
    ("E0:50:8B", "Dahua"),
    ("E0:D5:5E", "Intel"),
    ("E4:E4:AB", "Intel"),
    ("E4:F8:9C", "Intel"),
    ("E8:07:BF", "Vivo"),
    ("E8:86:14", "Realme"),
    ("E8:DB:84", "Espressif"),
    ("EC:08:6B", "Intel"),
    ("EC:2C:E2", "Intel"),
    ("EC:8E:B5", "Intel"),
    ("EC:E7:A2", "Apple"),
    ("EC:F3:42", "ZTE"),
    ("F0:18:98", "Apple"),
    ("F4:3F:61", "Intel"),
    ("F4:F2:6D", "Intel"),
    ("F8:32:E4", "Intel"),
    ("FC:34:97", "ASUS"),
    ("FC:AA:14", "Intel"),
    ("FC:E5:57", "Vivo"),
];

fn to_title_case(s: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = true;

    for c in s.chars() {
        if c.is_alphanumeric() {
            if capitalize_next {
                result.push(c.to_ascii_uppercase());
                capitalize_next = false;
            } else {
                result.push(c.to_ascii_lowercase());
            }
        } else {
            result.push(c);
            capitalize_next = true;
        }
    }
    result
}

pub(super) fn lookup_vendor(mac: &str) -> String {
    use std::collections::HashMap;
    use std::sync::OnceLock;

    static OUI_DATABASE: OnceLock<HashMap<String, String>> = OnceLock::new();

    let normalized: String = mac.replace(&[':', '-'][..], "").to_ascii_lowercase();

    if normalized.len() < 6 {
        return "Unknown".to_string();
    }

    // Explicit protection for local loopback / active system references
    if normalized.contains("loopback") || normalized == "self" {
        return "Self".to_string();
    }

    // Check if it is a locally administered / randomized Private MAC address.
    // By IEEE networking standards, randomized unicast MACs always end their first byte
    // with binary '10', meaning the second character of the MAC string is '2', '6', 'a', or 'e'.
    if normalized.len() >= 2 {
        let second_char = normalized.chars().nth(1).unwrap_or('0');
        if second_char == '2' || second_char == '6' || second_char == 'a' || second_char == 'e' {
            return "Private MAC (Randomized)".to_string();
        }
    }

    let prefix = &normalized[0..6];

    let db = OUI_DATABASE.get_or_init(|| {
        let mut map = HashMap::new();

        // 1. Populate with the curated manual list first as a baseline
        for &(oui, vendor) in MAC_VENDORS {
            let oui_clean = oui.replace(&[':', '-'][..], "").to_ascii_lowercase();
            map.insert(oui_clean, to_title_case(vendor));
        }

        // 2. Dynamically parse the complete official IEEE OUI registry file embedded at compile time.
        // The file is located in the `resources` directory relative to this source file.
        const OUI_DATA: &str = include_str!("../../resources/standards-oui.ieee.org.txt");
        for line in OUI_DATA.lines() {
            if line.contains("(hex)") {
                let parts: Vec<&str> = line.split("(hex)").collect();
                if parts.len() >= 2 {
                    let oui = parts[0]
                        .replace(&[':', '-'][..], "")
                        .trim()
                        .to_ascii_lowercase();
                    let vendor = parts[1].trim().to_string();
                    if !oui.is_empty() && !vendor.is_empty() {
                        map.insert(oui, to_title_case(&vendor));
                    }
                }
            }
        }

        map
    });

    if let Some(vendor) = db.get(prefix) {
        vendor.clone()
    } else {
        "Unknown".to_string()
    }
}
