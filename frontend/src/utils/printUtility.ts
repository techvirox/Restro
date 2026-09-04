import { EstimateBill, KOT } from '../types';

/**
 * Retrieves customized layout settings and header/footer configurations.
 */
export const getPrinterConfig = () => {
  let tenant: any = null;
  if (typeof window !== 'undefined') {
    try {
      const savedUser = localStorage.getItem('rio_restro_current_user');
      if (savedUser) {
        tenant = JSON.parse(savedUser)?.tenant;
      }
    } catch (e) {
      console.warn('Could not parse user session for printer config:', e);
    }
  }

  const defaultTitle = tenant?.clinicName || 'TECHVIROX RESTRO POS';
  const defaultAddress = tenant?.address || '';
  const defaultContact = tenant?.contactNumber || '';
  const defaultGstin = tenant?.gstin || '';
  const defaultFoodLicenseNo = tenant?.foodLicenseNo || '';
  const defaultProfilePic = tenant?.profilePic || '';
  const defaultFooterBanner = 'THANK YOU FOR PATRONISING US!';
  const defaultFooterSub = tenant?.clinicName ? `${tenant.clinicName} POS` : 'TechVirox Restro POS';

  if (typeof window === 'undefined') {
    return {
      title: defaultTitle,
      address: defaultAddress,
      contact: defaultContact,
      gstin: defaultGstin,
      foodLicenseNo: defaultFoodLicenseNo,
      profilePic: defaultProfilePic,
      footerBanner: defaultFooterBanner,
      footerSub: defaultFooterSub,
      showBarcode: true,
      showStamp: true,
      duplicateCopy: false,
    };
  }

  const titleVal = localStorage.getItem('bitespeed_printer_title');
  const addressVal = localStorage.getItem('bitespeed_printer_address');
  const contactVal = localStorage.getItem('bitespeed_printer_contact');
  const gstinVal = localStorage.getItem('bitespeed_printer_gstin');
  const foodLicenseNoVal = localStorage.getItem('bitespeed_printer_food_license_no');
  const profilePicVal = localStorage.getItem('bitespeed_printer_profile_pic');

  return {
    title: (titleVal && titleVal.trim()) ? titleVal.trim() : defaultTitle,
    address: (addressVal && addressVal.trim()) ? addressVal.trim() : defaultAddress,
    contact: (contactVal && contactVal.trim()) ? contactVal.trim() : defaultContact,
    gstin: (gstinVal && gstinVal.trim()) ? gstinVal.trim() : defaultGstin,
    foodLicenseNo: (foodLicenseNoVal && foodLicenseNoVal.trim()) ? foodLicenseNoVal.trim() : defaultFoodLicenseNo,
    profilePic: profilePicVal || defaultProfilePic,
    footerBanner: localStorage.getItem('bitespeed_printer_footer_banner') || defaultFooterBanner,
    footerSub: localStorage.getItem('bitespeed_printer_footer_sub') || defaultFooterSub,
    showBarcode: localStorage.getItem('bitespeed_printer_show_barcode') !== 'false',
    showStamp: localStorage.getItem('bitespeed_printer_show_stamp') !== 'false',
    duplicateCopy: localStorage.getItem('bitespeed_printer_duplicate_copy') === 'true',
  };
};

/**
 * Text padding helper
 */
export const padLine = (left: string, right: string, width: number): string => {
  const padLen = width - left.length - right.length;
  if (padLen <= 0) return left.substring(0, width - right.length) + right;
  return left + ' '.repeat(padLen) + right;
};

/**
 * ESC/POS Encoder helper class
 */
export class EscPosEncoder {
  private buffer: number[] = [];
  private encoder = new TextEncoder();

  initialize() {
    this.buffer.push(0x1B, 0x40);
    return this;
  }

  alignCenter() {
    this.buffer.push(0x1B, 0x61, 0x01);
    return this;
  }

  alignLeft() {
    this.buffer.push(0x1B, 0x61, 0x00);
    return this;
  }

  alignRight() {
    this.buffer.push(0x1B, 0x61, 0x02);
    return this;
  }

  bold(on: boolean) {
    this.buffer.push(0x1B, 0x45, on ? 1 : 0);
    return this;
  }

  doubleSize(on: boolean) {
    this.buffer.push(0x1D, 0x21, on ? 0x11 : 0x00);
    return this;
  }

  text(str: string) {
    const cleaned = str.replace(/₹/g, 'Rs.');
    const encodedBytes = this.encoder.encode(cleaned);
    encodedBytes.forEach(b => this.buffer.push(b));
    return this;
  }

  line(str: string = '') {
    this.text(str + '\n');
    return this;
  }

  feed(lines: number = 1) {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0A);
    }
    return this;
  }

  cut() {
    this.buffer.push(0x1D, 0x56, 66, 0);
    return this;
  }

  getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Generate ESC/POS bytes for EstimateBill
 */
export const generateEscPosBytes = (
  bill: EstimateBill,
  duplicateSlip: boolean = false,
  paperSize: '80mm' | '58mm' = '80mm'
): Uint8Array => {
  const config = getPrinterConfig();
  const finalDuplicateSlip = duplicateSlip || config.duplicateCopy;
  const is58mm = paperSize === '58mm';
  const charWidth = is58mm ? 32 : 48;

  const encoder = new EscPosEncoder();
  encoder.initialize();

  const appendReceiptSection = (isDuplicate: boolean) => {
    encoder.alignCenter();
    encoder.doubleSize(true);
    encoder.bold(true);
    encoder.line(config.title);

    encoder.doubleSize(false);
    encoder.bold(false);
    if (config.address) encoder.line(config.address);

    const subParts = [];
    if (config.gstin) subParts.push(`GSTIN: ${config.gstin}`);
    if (config.contact) subParts.push(`Ph: ${config.contact}`);
    if (subParts.length > 0) {
      encoder.line(subParts.join(' | '));
    }
    if (config.foodLicenseNo) {
      encoder.line(`FSSAI Lic: ${config.foodLicenseNo}`);
    }

    encoder.alignLeft();
    encoder.line('-'.repeat(charWidth));

    encoder.alignCenter();
    encoder.bold(true);
    if (isDuplicate) {
      encoder.line('★★ DUPLICATE RECEIPT ★★');
    } else {
      encoder.line('TAX INVOICE / RECEIPT');
    }
    encoder.bold(false);
    encoder.alignLeft();

    encoder.line(`Bill No: ${bill.billNumber}`);
    const dateFormatted = new Date(bill.createdAt).toLocaleDateString();
    const timeFormatted = new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    encoder.line(`Date: ${dateFormatted} ${timeFormatted}`);

    encoder.line(padLine(`Table: ${bill.tableName}`, `Mode: ${bill.orderType.toUpperCase()}`, charWidth));
    encoder.line(padLine(`Captain: ${bill.currentWaiter || 'Self'}`, `Payment: ${bill.paymentMethod || 'CASH'}`, charWidth));

    if (bill.customerName) {
      encoder.line(`Guest: ${bill.customerName}`);
      if (bill.customerPhone) {
        encoder.line(`Phone: ${bill.customerPhone}`);
      }
    }

    encoder.line('-'.repeat(charWidth));

    if (!is58mm) {
      encoder.bold(true);
      encoder.line(padLine('ITEM NAME', 'QTY   RATE      TOTAL', charWidth));
      encoder.bold(false);
    } else {
      encoder.bold(true);
      encoder.line(padLine('ITEM', 'QTY RATE   TOTAL', charWidth));
      encoder.bold(false);
    }
    encoder.line('-'.repeat(charWidth));

    bill.items.forEach(item => {
      const qty = item.quantity.toString();
      const rate = item.price.toFixed(0);
      const rowTotal = (item.price * item.quantity).toFixed(0);

      if (!is58mm) {
        let nPart = item.name;
        if (nPart.length > 22) nPart = nPart.substring(0, 20) + '..';
        const cols = `${qty.padEnd(4)} ₹${rate.padEnd(7)} ₹${rowTotal.padStart(8)}`;
        encoder.line(padLine(nPart, cols, charWidth));
      } else {
        let nPart = item.name;
        if (nPart.length > 12) nPart = nPart.substring(0, 10) + '..';
        const cols = `${qty.padEnd(3)} ₹${rate.padEnd(5)} ₹${rowTotal.padStart(6)}`;
        encoder.line(padLine(nPart, cols, charWidth));
      }
    });

    encoder.line('-'.repeat(charWidth));

    const addPriceLine = (label: string, amt: number) => {
      encoder.line(padLine(label, `₹${amt.toFixed(2)}`, charWidth));
    };

    const taxableBase = bill.subtotal - bill.discountAmount;
    const effectiveGstRate = taxableBase > 0 ? (bill.taxAmount / taxableBase) * 100 : 0;
    const halfRateText = `${(effectiveGstRate / 2).toFixed(1)}%`;

    addPriceLine('Subtotal:', bill.subtotal);
    if (bill.discountAmount > 0) {
      addPriceLine('Discount:', -bill.discountAmount);
    }
    addPriceLine(`SGST (${halfRateText}):`, bill.taxAmount / 2);
    addPriceLine(`CGST (${halfRateText}):`, bill.taxAmount / 2);
    if (bill.deliveryCharge && bill.deliveryCharge > 0) {
      addPriceLine('Delivery Charge:', bill.deliveryCharge);
    }

    encoder.line('-'.repeat(charWidth));

    encoder.bold(true);
    encoder.line(padLine('TOTAL AMOUNT:', `₹${bill.grandTotal.toFixed(2)}`, charWidth));
    encoder.bold(false);

    if (config.showStamp) {
      encoder.feed(1);
      encoder.alignCenter();
      encoder.bold(true);
      encoder.line(`★★ PAID (${bill.paymentMethod || 'CASH'}) ★★`);
      encoder.bold(false);
    }

    encoder.feed(1);
    encoder.alignCenter();
    encoder.line(config.footerBanner);
    encoder.line(config.footerSub);
    encoder.feed(3);
    encoder.cut();
  };

  appendReceiptSection(false);
  if (finalDuplicateSlip) {
    appendReceiptSection(true);
  }

  return encoder.getBuffer();
};

/**
 * WebUSB direct print driver
 */
export const printDirectUSB = async (dataBytes: Uint8Array): Promise<boolean> => {
  const nav = navigator as any;
  if (!nav.usb) {
    throw new Error('WebUSB is not supported in this browser.');
  }

  let device: any;
  const pairedDevices = await nav.usb.getDevices();
  if (pairedDevices.length > 0) {
    device = pairedDevices[0];
  } else {
    device = await nav.usb.requestDevice({ filters: [] });
  }

  if (!device) {
    throw new Error('No USB receipt printer device was selected.');
  }

  await device.open();
  await device.selectConfiguration(1);

  let interfaceNumber = 0;
  let endpointOutNumber = 1;
  let interfaceFound = false;

  for (const conf of device.configurations) {
    for (const iface of conf.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === 255 || alt.interfaceClass === 7) {
          const outEndpoint = alt.endpoints.find((ep: any) => ep.direction === 'out');
          if (outEndpoint) {
            interfaceNumber = iface.interfaceNumber;
            endpointOutNumber = outEndpoint.endpointNumber;
            interfaceFound = true;
            break;
          }
        }
      }
      if (interfaceFound) break;
    }
    if (interfaceFound) break;
  }

  await device.claimInterface(interfaceNumber);

  const chunkSize = 64;
  for (let offset = 0; offset < dataBytes.length; offset += chunkSize) {
    const dataPart = dataBytes.slice(offset, offset + chunkSize);
    await device.transferOut(endpointOutNumber, dataPart);
  }

  try {
    await device.releaseInterface(interfaceNumber);
    await device.close();
  } catch (e) {}

  return true;
};

// Persistent Session Bluetooth Connection Cache
let cachedBluetoothDevice: any = null;
let cachedBluetoothServer: any = null;
let cachedBluetoothCharacteristic: any = null;

export const isBluetoothConnected = (): boolean => {
  return !!(cachedBluetoothDevice && cachedBluetoothServer && cachedBluetoothServer.connected && cachedBluetoothCharacteristic);
};

export const getActiveBluetoothCharacteristic = async (promptPickerIfNeeded: boolean = false): Promise<any> => {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error('Web Bluetooth is not supported in this browser.');
  }

  if (cachedBluetoothDevice && cachedBluetoothServer && cachedBluetoothServer.connected && cachedBluetoothCharacteristic) {
    return cachedBluetoothCharacteristic;
  }

  if (!promptPickerIfNeeded) {
    throw new Error('Printer not connected.');
  }

  cachedBluetoothCharacteristic = null;
  cachedBluetoothServer = null;

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      '00001101-0000-1000-8000-00805f9b34fb',
      '000018f0-0000-1000-8000-00805f9b34fb',
    ]
  });

  if (!device) {
    throw new Error('Printer not connected.');
  }

  cachedBluetoothDevice = device;
  device.addEventListener('gattserverdisconnected', () => {
    cachedBluetoothServer = null;
    cachedBluetoothCharacteristic = null;
  });

  const server = device.gatt?.connected ? device.gatt : await device.gatt?.connect();
  if (!server) {
    throw new Error('Printer not connected.');
  }
  cachedBluetoothServer = server;

  const servicesList = await server.getPrimaryServices();
  for (const service of servicesList) {
    const charsList = await service.getCharacteristics();
    for (const char of charsList) {
      if (char.properties.write || char.properties.writeWithoutResponse) {
        cachedBluetoothCharacteristic = char;
        break;
      }
    }
    if (cachedBluetoothCharacteristic) break;
  }

  if (!cachedBluetoothCharacteristic) {
    throw new Error('Printer not connected.');
  }

  return cachedBluetoothCharacteristic;
};

export const connectBluetoothPrinterSession = async (): Promise<boolean> => {
  try {
    await getActiveBluetoothCharacteristic(true);
    return true;
  } catch (e) {
    return false;
  }
};

export const printDirectBluetooth = async (dataBytes: Uint8Array, promptPickerIfNeeded: boolean = false): Promise<boolean> => {
  const characteristic = await getActiveBluetoothCharacteristic(promptPickerIfNeeded);

  const pipeMaxBytes = 20;
  for (let i = 0; i < dataBytes.length; i += pipeMaxBytes) {
    const chunk = dataBytes.slice(i, i + pipeMaxBytes);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
  }

  return true;
};

/**
 * Isolated iframe standard fallback printing
 */
export const printThermalBillIframe = (
  bill: EstimateBill, 
  duplicateSlip: boolean = false,
  paperSize: '80mm' | '58mm' = '80mm'
) => {
  const frameId = 'thermal-print-iframe';
  const existingFrame = document.getElementById(frameId);
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = frameId;
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.top = '-1000px';
  iframe.style.left = '-1000px';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  const dateFormatted = new Date(bill.createdAt).toLocaleDateString();
  const timeFormatted = new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const config = getPrinterConfig();
  const finalDuplicateSlip = duplicateSlip || config.duplicateCopy;

  const is58mm = paperSize === '58mm';
  const sizeSpec = is58mm ? '58mm 210mm' : '80mm 297mm';
  const printableWidth = is58mm ? '52mm' : '76mm';

  const taxableBase = bill.subtotal - bill.discountAmount;
  const effectiveGstRate = taxableBase > 0 ? (bill.taxAmount / taxableBase) * 100 : 0;
  const halfRateText = `${(effectiveGstRate / 2).toFixed(1)}%`;

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tax Invoice - ${bill.billNumber}</title>
      <style>
        @page { size: ${sizeSpec}; margin: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-weight: 600;
          color: #000;
          background: #fff;
          margin: 0;
          padding: ${is58mm ? '2px' : '4px'};
          width: ${printableWidth};
          font-size: ${is58mm ? '12px' : '14px'};
          line-height: 1.3;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold, th, h3, h4, b, strong { font-weight: 900 !important; }
        .my-1 { margin: 4px 0; }
        .border-dashed { border-top: 1px dashed #000; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        th, td { text-align: left; padding: 2px 0; }
      </style>
    </head>
    <body>
      <div class="text-center font-bold" style="font-size: 16px;">${config.title}</div>
      <div class="text-center" style="font-size: 11px;">
        ${config.address ? `${config.address}<br>` : ''}
        ${config.contact ? `Ph: ${config.contact}<br>` : ''}
      </div>
      <div class="border-dashed my-1"></div>
      <div class="text-center font-bold">TAX INVOICE</div>
      <div style="font-size: 11px; margin: 4px 0;">
        <div>Bill No: ${bill.billNumber}</div>
        <div>Date: ${dateFormatted} ${timeFormatted}</div>
        <div>Table: ${bill.tableName} | Mode: ${bill.orderType.toUpperCase()}</div>
        ${bill.customerName ? `<div>Guest: ${bill.customerName} (${bill.customerPhone})</div>` : ''}
      </div>
      <table>
        <thead>
          <tr style="border-top: 1px dashed #000; border-bottom: 1px dashed #000;">
            <th>ITEM</th>
            <th style="text-align: center;">QTY</th>
            <th style="text-align: right;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${bill.items.map(item => `
            <tr>
              <td><b>${item.name}</b></td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">₹${(item.price * item.quantity).toFixed(0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="border-dashed my-1"></div>
      <table>
        <tr><td>Subtotal:</td><td style="text-align: right;">₹${bill.subtotal.toFixed(2)}</td></tr>
        ${bill.discountAmount > 0 ? `<tr><td>Discount:</td><td style="text-align: right;">-₹${bill.discountAmount.toFixed(2)}</td></tr>` : ''}
        <tr><td>Tax:</td><td style="text-align: right;">₹${bill.taxAmount.toFixed(2)}</td></tr>
        <tr style="font-weight: bold; font-size: 14px; border-top: 1px solid #000;">
          <td>TOTAL:</td><td style="text-align: right;">₹${bill.grandTotal.toFixed(2)}</td>
        </tr>
      </table>
      <div class="text-center font-bold" style="margin-top: 10px; font-size: 11px;">
        ${config.footerBanner}
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 250);
        };
      </script>
    </body>
    </html>
  `;

  doc.open();
  doc.write(receiptHtml);
  doc.close();
};

/**
 * Main Centralized Print Controller
 */
export const printThermalBill = (
  bill: EstimateBill, 
  duplicateSlip: boolean = false,
  paperSize: '80mm' | '58mm' = '80mm',
  onNotConnected?: () => void
) => {
  if (typeof window === 'undefined') return;

  const driver = localStorage.getItem('bitespeed_printer_driver') || 'system';

  if (driver === 'usb') {
    const dataBytes = generateEscPosBytes(bill, duplicateSlip, paperSize);
    printDirectUSB(dataBytes).catch(() => {
      if (onNotConnected) onNotConnected();
      else printThermalBillIframe(bill, duplicateSlip, paperSize);
    });
  } else if (driver === 'bluetooth') {
    const dataBytes = generateEscPosBytes(bill, duplicateSlip, paperSize);
    printDirectBluetooth(dataBytes, false)
      .catch(() => {
        if (onNotConnected) {
          onNotConnected();
        } else {
          // Trigger global custom event if no callback passed
          const event = new CustomEvent('printer-not-connected', { detail: { bill, duplicateSlip, paperSize } });
          window.dispatchEvent(event);
        }
      });
  } else {
    printThermalBillIframe(bill, duplicateSlip, paperSize);
  }
};

/**
 * Generate ESC/POS bytes for KOT
 */
export const generateKotEscPosBytes = (
  kot: KOT,
  paperSize: '80mm' | '58mm' = '80mm'
): Uint8Array => {
  const config = getPrinterConfig();
  const is58mm = paperSize === '58mm';
  const charWidth = is58mm ? 32 : 48;

  const encoder = new EscPosEncoder();
  encoder.initialize();

  encoder.alignCenter();
  encoder.doubleSize(true);
  encoder.bold(true);
  encoder.line('KITCHEN ORDER TICKET');

  encoder.doubleSize(false);
  encoder.bold(false);
  encoder.line(config.title);

  encoder.alignLeft();
  encoder.line('='.repeat(charWidth));

  encoder.bold(true);
  encoder.line(`KOT: ${kot.kotNumber}  [${kot.tableName}]`);
  encoder.bold(false);

  const dateFormatted = new Date(kot.createdAt).toLocaleDateString();
  const timeFormatted = new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  encoder.line(`Time: ${dateFormatted} ${timeFormatted}`);
  if (kot.waiterName) {
    encoder.line(`Captain: ${kot.waiterName}`);
  }

  encoder.line('-'.repeat(charWidth));
  encoder.bold(true);
  encoder.line(padLine('ITEM ORDERED', 'QTY', charWidth));
  encoder.bold(false);
  encoder.line('-'.repeat(charWidth));

  kot.items.forEach(item => {
    encoder.bold(true);
    encoder.line(padLine(item.name, `x${item.quantity}`, charWidth));
    encoder.bold(false);
    if (item.notes) {
      encoder.line(`  >> NOTE: ${item.notes}`);
    }
  });

  encoder.line('='.repeat(charWidth));
  encoder.feed(2);
  encoder.cut();

  return encoder.getBuffer();
};

export const printThermalKot = (
  kot: KOT,
  paperSize: '80mm' | '58mm' = '80mm'
) => {
  if (typeof window === 'undefined') return;

  const driver = localStorage.getItem('bitespeed_printer_driver') || 'system';

  if (driver === 'usb') {
    const dataBytes = generateKotEscPosBytes(kot, paperSize);
    printDirectUSB(dataBytes).catch(() => {});
  } else if (driver === 'bluetooth') {
    const dataBytes = generateKotEscPosBytes(kot, paperSize);
    printDirectBluetooth(dataBytes, false).catch(() => {});
  }
};
