---
title: "Shellcode from rust"
date: 2025-02-10
---

# Shellcode Template in Rust

To begin writing shellcode in Rust, the cargo.toml should have the following profile for release and features. Setting lto to true and opt-level to "s" pr "z". Can drastically improve the size of the bin. Along with removing rust's panic feature, we will discuss this more later. TLDR; This will do some compile magic to keep our binary smaller ( Than usual ). 

Cargo.toml
```toml
[package]
name = "example"
version = "0.1.0"
edition = "2021"

[dependencies]
#panic-halt = "1.0.0" optional
linked_list_allocator = "0.10.5"
[profile.release]
panic = "abort"
opt-level = "s"
lto = true
codegen-units = 1

[build-dependencies]
cc = "1.0"


[features]
default = ["no-unwind"]
no-unwind = []
```

A simple build script for the shellcode 
```bash
cargo build --bin example --release --target x86_64-pc-windows-gnu ;

cp target/x86_64-pc-windows-gnu/release/example.exe .;

objcopy -O binary example.exe ../callback/example.bin --only-section .text
```

At the tippy top of our Rust program add this. 

```rust
#![no_std]
#![no_main]
```
This is telling the rust compiler that we do NOT want to include the standard libray (HUGE), and that we have no `main()` fn. 

Since this rust example has `no_main`. We will have to write the start fn to kick off the shellcode. 

```rust
#[no_mangle]
pub extern "C" fn _start() -> u32 {
    execute()
}
```
The way this shellcode runs is by calling `execute()` which returns a u32. `_start` then returns the result of `execute`.

Now that we have our inital setup complete we can start writing our own shellcode in rust. 
```rust
pub fn execute() -> u32 {
  //Do Stuff and shit
  0
}
```

### PANIC!

If we try to build it we get an error stating the panic handler is no where to be found. 

```
error: `#[panic_handler]` function required, but not found
```

Ahhhh so remember when I said we will look at the removing panic. Now is the time. Well instead of unwraveling up the stack we want the program to exit immediately. 

To do this add this anywhere in the code. 
```rust
#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    loop {}
}
```

A simpler more recent approach I've used was also the `panic-halt` crate. https://crates.io/crates/panic-halt
```
cargo add panic-halt
```

Then at the top of your main.rs 

```rust
extern crate panic_halt;
```

## Loader

https://doc.rust-lang.org/book/ch19-01-unsafe-rust.html

Before we dive too deep, let's talk about the `unsafe` keyword. You might be thinking "Unsafe?? In Rust??" what's the point of rust then? Fair point, but using unsafe doesn't completley void using rust. When using the unsafe keyword, the compiler will still continue borrow checking. Essentially meaning, an `unsafe` block does not inherantly mean the block is unsafe. What using the unsafe keyword allows us to do:
- Call Windows API functions via raw pointers
- Access memory directly
- Use inline assembly
- Cast between function pointers and integers

Let's take what we know about the unsafe keyword and use it for a loader for our shellcode. The `_start` fn from our shellcode takes 0 arguments and returns a u32. Let's create a fn called `start_fn` with a type of `unsafe extern "C" fn() -> u32`. 
 
```rust
let start_fn: unsafe extern "C" fn() -> u32 = mem::transmute(secure_mem.as_mut_ptr());
```


Instead of just copying the raw shellcode into mem::transmute let's create a wrapper arounf `VirtualAlloc`

```rust
impl SecureMemory {
    fn new(size: usize) -> Result<Self, Box<dyn std::error::Error>> {
        // Ensure proper alignment for x64 code execution (16-byte alignment)
        let aligned_size = (size + 15) & !15;

        unsafe {
            let ptr = VirtualAlloc(None, aligned_size, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
            //let ptr = ((ptr as usize + 15) & !15) as *mut c_void;
            if ptr.is_null() {
                return Err("Failed to allocate memory".into());
            }

            // Verify alignment
            if (ptr as usize) & 15 != 0 {
                VirtualFree(ptr, 0, MEM_RELEASE)?;
                return Err("Memory not properly aligned".into());
            }

            Ok(SecureMemory {
                ptr,
                size: aligned_size,
            })
        }
    }

    fn as_mut_ptr(&self) -> *mut std::ffi::c_void {
        self.ptr
    }
}

impl Drop for SecureMemory {
    fn drop(&mut self) {
        unsafe {
            let _ = VirtualFree(self.ptr, 0, MEM_RELEASE);
        }
    }
}
```


```rust

fn main() {
  // Handle shellcode
  let handle = thread::spawn(move || {
            unsafe {
                let secure_mem = SecureMemory::new(shellcode.len()).unwrap();
                // Copy shellcode with verification
                ptr::copy_nonoverlapping(
                    shellcode.as_ptr(),
                    secure_mem.as_mut_ptr() as *mut u8,
                    shellcode.len(),
                );
                println!("Shellcode copied, verifying...");
                // Verify copy
                let copied_slice = core::slice::from_raw_parts(
                    secure_mem.as_mut_ptr() as *const u8,
                    shellcode.len(),
                );

                if copied_slice != shellcode {
                    return anyhow::Ok(());
                }

                println!("Setting memory protection...");
                // Change protection with error handling
                let mut old_protect = PAGE_READWRITE;
                let result = VirtualProtect(
                    secure_mem.as_mut_ptr(),
                    secure_mem.size,
                    PAGE_EXECUTE_READWRITE,
                    &mut old_protect,
                );
                if !result.is_ok() {
                    println!("VirtualProtect failed: {}", std::io::Error::last_os_error());
                    return anyhow::Ok(());
                }

                println!("Executing shellcode...");
                let start_fn: unsafe extern "C" fn() -> u32 =
                    mem::transmute(secure_mem.as_mut_ptr());
                let exit = start_fn();
                println!("Exit: {exit}");
            };
            Ok(())
        });
        let _ = handle.join().unwrap();
        //Handle shellcode exit

}
```

Since our shellcode just returns 0 this working POC proves our template is ready to expand. 

![image](https://github.com/user-attachments/assets/195f25c2-82bf-4940-be7a-07d095c5d0d6)


## Expanding the Template

