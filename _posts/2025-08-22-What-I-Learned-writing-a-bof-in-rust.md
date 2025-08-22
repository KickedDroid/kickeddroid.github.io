---
title: "What I learned writing a bof in rust"
date: 2025-08-22
---

To preface I won't be explaining how BOF/COFFs work. Instead I will just show you the process and headache of attempting to write a bof in rust. 

## Writing the entry point in rust

This seemed trivial. Most coffloaders will default to `go` for the entry point. And to prevent the rust compiler from renaming the entry point we use `#[no_mangle]`. Exposing one of the Beacon API functions, using the same method, with prefix `__imp_`.

```rust
#[no_mangle]
pub unsafe extern "C" fn go(args: *const c_char, alen: i32) {
    ...
}

#[no_mangle]
unsafe extern "C" {
	fn __imp_BeaconOutput(_: c_int, _: *const c_char, _: c_int);
} 
```

compiling with rustc

```bash
RUSTFLAGS="-C target-cpu=x86-64 -C target-feature=+crt-static -C link-arg=-nostartfiles -C link-arg=-nodefaultlibs -C link-arg=-Wl,--gc-sections" \
rustc --target x86_64-pc-windows-gnu \
    -C opt-level=z \
    -C panic=abort \
    -C debuginfo=0 \
    -C strip=symbols \
    -C codegen-units=1 \
    -C embed-bitcode=no \
    --emit=obj \
    src/lib.rs -o objects/rust_part.o
```

Looking at the object file, this should work.

```
0x0000000000000000 __imp_BeaconOutput
0x0000000000000001 go
```

Running it inside of a Coffer loader. It fails to run the `go` fn. For some reason this doesn't work like ever. When I say I've tried so many things, I've tried writing the `go` func using `global_asm!` macro, using `asm!` to align the stack, all of which confused me more and didn't work. 

I have tried and tried and still can't figure it out. So what now.

## Trying something else ??

My first idea was to keep the entry point in c and pass the beacon api functions to rust with FFI. Like this 

```c
//entry.c
// Extern Rust initialize fn
extern void initialize(
    void (*beacon_output)(int, const char *, int),
    void (*beacon_printf)(int, const char * fmt, ...),

    char* args,
    int alen
);

void go(char* args, int alen) {
    // Pass the fn pointers to the rust wrapper
    initialize(
        BeaconOutput,
        BeaconPrintf,

        args,
        alen
    );
}
```

This ended up working pretty well. On the rust side 

```rust
//lib.rs
pub type BeaconOutputFn = extern "C" fn(i32, *const c_char, i32);
pub type BeaconPrintfFn = extern "C" fn(i32, *const c_char, *mut c_char);
#[unsafe(no_mangle)]
pub unsafe extern "C" fn initialize(
    beacon_output: BeaconOutputFn,
    beacon_printf: BeaconPrintfFn,

    // Arguments from Beacon
    args: *mut c_char,
    alen: c_int,
) {
    let mut beacon = Beacon::new(beacon_output, beacon_printf, args, alen);
    rust_bof(beacon);
}

//rust_bof.rs
pub fn rust_bof(mut beacon: Beacon) {
    beacon.output("HELLOOOOOOOO");
}
```

Anndd this worked flawlessly, what in the actual fuck. 

If anyone can explain to me why this works but the first method failed please hit me up on twitter. 

As a Proof of concept this was fantastic as it proved I could actually write bofs this way. As the project grew I realized I wanted a more modular approach. 


```c
extern void rust_bof(char* args, int alen);

void go(char* args, int alen) {
    rust_bof(args, alen);
}

extern void starOutput(int type, char* args, int alen) {
    BeaconOutput(0, args, alen);
}
```

Now in rust 
```rust

unsafe extern "C" {
    fn starOutput(r#type: c_int, data: *const c_char, len: c_int);
    ...
}

//Create a wrapper fn 
pub fn output(bytes: &str) {
    unsafe {
        (starOutput)(
            0 as c_int,
            bytes.as_ptr() as *const c_char,
            bytes.len() as i32,
        );
        //Add null byte
        (starOutput)(0 as c_int, core::ptr::null_mut() as *const c_char, 0 as i32);
    }
}
```

Now use the wrapper fn 

```rust
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rust_bof(args: *mut c_char, alen: c_int) {
    output("HELOOOOOO");
}
```


Now this might seem redundant and over engineered but trust me this is the smallest implementation I have to date. Rust might not have been a great choice. But this idea was fun to build out. Once the functions are built out though, it's easy to write reliable code to be used in a BOF. 
