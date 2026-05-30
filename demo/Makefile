.PHONY: all clean

SRCS = $(wildcard src/*.c)
OBJS = $(SRCS:.c=.o)
TARGET = app

all: $(TARGET)

$(TARGET): $(OBJS)
	@echo "[LINK] Linking $(TARGET)..."
	gcc -o $(TARGET) $(OBJS)

src/%.o: src/%.c
	@echo "[CC] Compiling $<..."
	gcc -c -o $@ $<

clean:
	rm -f $(OBJS) $(TARGET)
